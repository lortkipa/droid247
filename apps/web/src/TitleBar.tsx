import { useEffect, useState } from "react";
import { appWindow, getTitleBar } from "./platform.ts";

/**
 * The desktop app's title bar. The window has no native one (except macOS's
 * traffic lights), so this is an invisible strip to drag the window by, plus
 * minimize / maximize / close buttons on Linux and Windows.
 */
export function TitleBar() {
  const kind = getTitleBar();
  if (kind === "native") return null;
  return (
    // Tauri only drags from the element with the attribute, so the buttons stay clickable.
    // Double-clicking it toggles maximize, like a native title bar.
    <div className="titlebar" data-tauri-drag-region>
      {kind === "custom" && <WindowControls />}
    </div>
  );
}

function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(
    () =>
      appWindow.onMaximizedChange((value) => {
        setMaximized(value);
        // Lets CSS drop the window edge while maximized.
        document.documentElement.toggleAttribute("data-maximized", value);
      }),
    [],
  );

  const maximizeLabel = maximized ? "Restore" : "Maximize";
  // Out of the tab order, like native title bar buttons.
  return (
    <div className="window-controls">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Minimize"
        title="Minimize"
        onClick={() => appWindow.minimize()}
      >
        <svg viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
          <path d="M0 4.5h8" />
        </svg>
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={maximizeLabel}
        title={maximizeLabel}
        onClick={() => appWindow.toggleMaximize()}
      >
        {maximized ? (
          <svg viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
            <rect x="0.5" y="2.5" width="5" height="5" />
            <path d="M2.5 2.5v-2h5v5h-2" />
          </svg>
        ) : (
          <svg viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
            <rect x="0.5" y="0.5" width="7" height="7" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="close"
        tabIndex={-1}
        aria-label="Close"
        title="Close"
        onClick={() => appWindow.close()}
      >
        <svg viewBox="0 0 8 8" aria-hidden="true">
          <path d="M.5.5l7 7M7.5.5l-7 7" />
        </svg>
      </button>
    </div>
  );
}
