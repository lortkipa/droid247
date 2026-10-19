/** Running inside the Tauri desktop app (the web build in a native window). */
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
