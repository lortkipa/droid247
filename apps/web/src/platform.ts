import { isTauri } from "@tauri-apps/api/core";

export type Platform = "web" | "desktop" | "mobile";

/**
 * Which shell is running the UI. Keep platform branching here so the rest of
 * the UI stays shell-agnostic.
 */
export function getPlatform(): Platform {
  if (!isTauri()) return "web";
  const os = import.meta.env.TAURI_ENV_PLATFORM;
  return os === "android" || os === "ios" ? "mobile" : "desktop";
}
