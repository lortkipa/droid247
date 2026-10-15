// Moving focus between droid247 and the browser during a browser sign-in.
//
// Desktops only let an app take the front when the app the user was just using
// hands it permission. On Wayland that is an xdg-activation token; going out we
// get one from GTK for the click, and coming back the browser launches a
// `droid247://` link with its own token, which the new process forwards to the
// running window. macOS and Windows do the equivalent by themselves.

use tauri::{App, AppHandle, Manager, Runtime, Url, WebviewWindow};

const MAIN_WINDOW: &str = "main";

/// Wires up the ways a `droid247://` link (or a second launch) reaches the running app.
pub fn setup<R: Runtime>(app: &App<R>) {
    #[cfg(target_os = "linux")]
    linux::listen(app.handle(), &app.config().identifier);

    // macOS delivers links to the running app, which the system has already activated.
    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_deep_link::DeepLinkExt;
        let handle = app.handle().clone();
        app.deep_link().on_open_url(move |_| bring_to_front(&handle, None));
    }

    // Installers register the scheme. Dev builds and AppImages aren't installed, so do it here.
    #[cfg(any(target_os = "linux", all(windows, debug_assertions)))]
    if cfg!(debug_assertions) || app.env().appimage.is_some() {
        use tauri_plugin_deep_link::DeepLinkExt;
        if let Err(e) = app.deep_link().register_all() {
            log(&format!("couldn't register the droid247:// scheme: {e}"));
        }
    }
}

/// Opens an http(s) address in the default browser and lets the browser come to the front.
// Not async, so it runs on the main thread, where GTK must be called.
#[tauri::command]
pub fn open_in_browser<R: Runtime>(window: WebviewWindow<R>, url: String) -> Result<(), String> {
    let parsed = Url::parse(&url).map_err(|e| e.to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(format!("refusing to open a {} address", parsed.scheme()));
    }

    #[cfg(target_os = "linux")]
    match linux::launch_with_token(&window, &url) {
        Ok(()) => return Ok(()),
        Err(e) => log(&format!("GIO couldn't open the browser ({e}); falling back")),
    }
    #[cfg(not(target_os = "linux"))]
    let _ = window;

    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// Brings the main window to the front, using the activation token the launcher gave us if any.
pub fn bring_to_front<R: Runtime>(app: &AppHandle<R>, _token: Option<String>) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
        return;
    };
    #[cfg(target_os = "linux")]
    {
        let main = window.clone();
        let _ = window.run_on_main_thread(move || linux::present(&main, _token));
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn log(message: &str) {
    eprintln!("[droid247] {message}");
}

#[cfg(target_os = "linux")]
pub mod linux {
    use super::{bring_to_front, log};
    use gtk::prelude::*;
    use std::io::{Read, Write};
    use std::os::unix::net::{UnixListener, UnixStream};
    use std::path::PathBuf;
    use std::time::Duration;
    use tauri::{AppHandle, Runtime, WebviewWindow};

    pub(super) fn launch_with_token<R: Runtime>(
        window: &WebviewWindow<R>,
        url: &str,
    ) -> Result<(), String> {
        let gtk_window = window.gtk_window().map_err(|e| e.to_string())?;
        // GTK asks the compositor for a token tied to the click that got us
        // here, and GIO hands it to the browser in XDG_ACTIVATION_TOKEN.
        let context = gtk_window.display().app_launch_context();
        gio::AppInfo::launch_default_for_uri(url, context.as_ref()).map_err(|e| e.to_string())
    }

    pub(super) fn present<R: Runtime>(window: &WebviewWindow<R>, token: Option<String>) {
        let Ok(gtk_window) = window.gtk_window() else {
            return;
        };
        let wayland = gtk_window.display().type_().name() == "GdkWaylandDisplay";
        match token {
            // GTK passes the token straight to xdg_activation_v1.activate. Don't
            // also call present(): on Wayland it asks for a token of its own,
            // which the compositor refuses with a "droid247 is ready" notice.
            Some(token) if wayland => {
                gtk_window.deiconify();
                gtk_window.set_startup_id(&token);
            }
            // On X11 the token carries the launch timestamp that present() needs.
            Some(token) => {
                gtk_window.set_startup_id(&token);
                gtk_window.present();
            }
            None => gtk_window.present(),
        }
    }

    /// Where the running instance listens. Per user, and named after the bundle identifier.
    fn socket_path(identifier: &str) -> PathBuf {
        let dir = std::env::var_os("XDG_RUNTIME_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir);
        dir.join(format!("{identifier}.sock"))
    }

    /// The token whoever launched this process gave it, if any.
    fn launch_token() -> String {
        ["XDG_ACTIVATION_TOKEN", "DESKTOP_STARTUP_ID"]
            .iter()
            .find_map(|name| std::env::var(name).ok().filter(|v| !v.is_empty()))
            .unwrap_or_default()
    }

    /// Hands this launch to an instance that is already running, if there is one.
    /// Returns true when it did, and this process should exit.
    ///
    /// tauri-plugin-single-instance only forwards argv and the working directory,
    /// which loses the activation token, so Linux does it here.
    pub fn forward_to_running(identifier: &str) -> bool {
        let Ok(mut stream) = UnixStream::connect(socket_path(identifier)) else {
            return false;
        };
        stream.write_all(launch_token().as_bytes()).is_ok()
    }

    /// Starts listening for later launches. Each one brings the main window to the front.
    pub fn listen<R: Runtime>(app: &AppHandle<R>, identifier: &str) {
        let path = socket_path(identifier);
        // Nothing answered in forward_to_running, so anything here is left over from a crash.
        let _ = std::fs::remove_file(&path);
        let listener = match UnixListener::bind(&path) {
            Ok(listener) => listener,
            Err(e) => return log(&format!("can't listen on {}: {e}", path.display())),
        };
        let app = app.clone();
        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
                let mut token = String::new();
                let _ = stream.take(4096).read_to_string(&mut token);
                let token = Some(token.trim().to_owned()).filter(|t| !t.is_empty());
                log(if token.is_some() {
                    "another launch handed over, with an activation token"
                } else {
                    "another launch handed over, without an activation token"
                });
                bring_to_front(&app, token);
            }
        });
    }
}
