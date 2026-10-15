#[cfg(desktop)]
mod activation;

// Shared entry point for every platform. Desktop calls `run()` from main.rs;
// Android and iOS call it through the generated `mobile_entry_point`.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();

    // A second launch, such as the browser opening a droid247:// link, hands
    // over to the window that's already open instead of starting another.
    #[cfg(target_os = "linux")]
    if activation::linux::forward_to_running(&context.config().identifier) {
        return;
    }

    let builder = tauri::Builder::default();
    // Must be the first plugin, so a second instance exits before the rest start.
    #[cfg(windows)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
        activation::bring_to_front(app, None);
    }));
    let builder = builder.plugin(tauri_plugin_opener::init());
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![activation::open_in_browser])
        .setup(|app| {
            activation::setup(app);
            Ok(())
        });
    builder
        .run(context)
        .expect("error while running droid247");
}
