/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Set by the Tauri CLI during `tauri dev` / `tauri build`. */
  readonly TAURI_ENV_PLATFORM?: "linux" | "windows" | "darwin" | "android" | "ios";
}
