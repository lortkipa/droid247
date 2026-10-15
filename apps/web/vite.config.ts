import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Set by `tauri dev` when targeting a phone, so the device can reach the dev server.
const tauriDevHost = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  // Favicons and the web manifest are served straight from the brand kit.
  publicDir: "../../brand/icons/web",
  // Tauri prints Rust errors to the same terminal; keep them visible.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Open a browser tab for `pnpm dev`, but not when Tauri runs this server for its own window.
    open: !process.env.TAURI_ENV_PLATFORM,
    host: tauriDevHost || false,
    hmr: tauriDevHost ? { protocol: "ws", host: tauriDevHost, port: 5174 } : undefined,
    fs: { allow: ["../.."] },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    // Tauri's webviews: WebView2 (Chromium) on Windows, WebKit elsewhere.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari15",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
});
