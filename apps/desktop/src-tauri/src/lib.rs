/// Desktop shell around the Expo web build. Native desktop features
/// (tray icon, notifications, autostart) get added here as plugins.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Droid247");
}
