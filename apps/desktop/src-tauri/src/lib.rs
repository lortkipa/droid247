/// Desktop shell around the Expo web build. Native desktop features
/// (tray icon, notifications, autostart) get added here as plugins.
///
/// Google sign-in runs in the system browser and comes back through a
/// droid247:// deep link, which the web app reads with the deep-link plugin
/// (see apps/client/src/lib/auth-client.ts).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Must be registered first. On Linux and Windows a deep link starts a
    // second process; this forwards its URL to the running app and focuses it.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            // Installers register the scheme on Linux and Windows; during
            // development (`tauri dev`) register it at runtime instead.
            // macOS only supports it from a bundled app.
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Droid247");
}
