import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { getDesktopOs, getTitleBar } from "./platform.ts";
import { TitleBar } from "./TitleBar.tsx";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist-mono/500.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing from index.html");

// Hooks for the window chrome styles in styles.css.
const os = getDesktopOs();
if (os) {
  document.documentElement.dataset.os = os;
  document.documentElement.dataset.titlebar = getTitleBar();
}

createRoot(root).render(
  <StrictMode>
    <TitleBar />
    <App />
  </StrictMode>,
);
