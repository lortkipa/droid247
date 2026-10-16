import { cancel, onUrl, start } from "@fabianlars/tauri-plugin-oauth";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

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

export type DesktopOs = "linux" | "windows" | "macos";

/** The desktop OS, or null outside the desktop app. */
export function getDesktopOs(): DesktopOs | null {
  if (getPlatform() !== "desktop") return null;
  const os = import.meta.env.TAURI_ENV_PLATFORM;
  if (os === "darwin") return "macos";
  return os === "windows" ? "windows" : "linux";
}

/**
 * Who draws the window controls:
 * - native: the browser or phone (nothing for us to do)
 * - overlay: macOS, whose traffic lights float over the page
 * - custom: Linux and Windows, where the window has no decorations and the UI draws them
 */
export type TitleBar = "native" | "overlay" | "custom";

export function getTitleBar(): TitleBar {
  const os = getDesktopOs();
  if (!os) return "native";
  return os === "macos" ? "overlay" : "custom";
}

/** The desktop window. Only call these when `getTitleBar()` isn't "native". */
export const appWindow = {
  minimize: () => getCurrentWindow().minimize(),
  toggleMaximize: () => getCurrentWindow().toggleMaximize(),
  // There's only one window, so closing it quits the app.
  close: () => getCurrentWindow().close(),
  /** Calls `onChange` with the current state and again whenever it may have changed. */
  onMaximizedChange(onChange: (maximized: boolean) => void): () => void {
    const window = getCurrentWindow();
    let stopped = false;
    const report = () =>
      window.isMaximized().then(
        (maximized) => {
          if (!stopped) onChange(maximized);
        },
        () => {},
      );
    report();
    const unlisten = window.onResized(report);
    return () => {
      stopped = true;
      unlisten.then((fn) => fn());
    };
  },
};

/** Whether `openBrowserSignIn` waits on a separate browser (rather than leaving this page). */
export function browserSignInIsExternal(): boolean {
  return getPlatform() !== "web";
}

/**
 * Shown in the browser tab once a desktop sign-in hands control back to the app.
 * It asks the browser, once, to open `droid247://`, which brings the app to the
 * front where the desktop allows it (the browser confirms the first time). The
 * link carries nothing: the result already came in on the loopback port.
 */
const DESKTOP_DONE_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>droid247</title>
<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fff;color:#000}@media (prefers-color-scheme:dark){body{background:#000;color:#fff}}</style></head>
<body><p>Return to droid247 to continue.</p><script>location.href = "droid247://open";</script></body></html>`;

/**
 * Fixed loopback ports, tried in order. Browsers remember "always allow opening
 * droid247" per origin, port included, so a random port would ask every time.
 */
const DESKTOP_RETURN_PORTS = [47247, 47248, 47249, 47250];

/**
 * Sends the user through a browser sign-in that ends with a redirect to
 * `returnTo`, and resolves with the address it landed on.
 *
 * - Web: navigates this page away; the result arrives as query parameters when
 *   the app loads again, so this resolves with null.
 * - Desktop: Google refuses embedded webviews, so this opens the system browser
 *   and catches the redirect on a temporary 127.0.0.1 listener. The page it
 *   leaves in the browser opens droid247 again, which brings this window back.
 */
export async function openBrowserSignIn(
  startUrl: (returnTo: string) => string,
  signal: AbortSignal,
): Promise<URL | null> {
  const platform = getPlatform();
  if (platform === "web") {
    window.location.assign(startUrl(window.location.origin));
    return null;
  }
  if (platform === "mobile") throw new Error("Browser sign-in isn't available on mobile yet");

  const port = await start({ ports: DESKTOP_RETURN_PORTS, response: DESKTOP_DONE_PAGE }).catch(() =>
    start({ response: DESKTOP_DONE_PAGE }),
  );
  let unlisten: (() => void) | undefined;
  try {
    const landed = new Promise<string>((resolve, reject) => {
      onUrl(resolve).then((fn) => {
        unlisten = fn;
      }, reject);
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    // Opened from Rust so the browser gets permission to come to the front.
    await invoke("open_in_browser", { url: startUrl(`http://127.0.0.1:${port}/`) });
    return new URL(await landed);
  } finally {
    unlisten?.();
    // The listener stops by itself after one redirect; this covers giving up early.
    await cancel(port).catch(() => {});
  }
}
