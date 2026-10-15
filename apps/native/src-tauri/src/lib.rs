// Shared entry point for every platform. Desktop calls `run()` from main.rs;
// Android and iOS call it through the generated `mobile_entry_point`.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running droid247");
}
