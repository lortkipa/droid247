import { useRef, useState, type PointerEvent } from 'react';

import type { ResizeHandleProps } from './ResizeHandle';

/** Width of the drag strip over the sidebar's right edge. */
export const HANDLE_WIDTH = 8;

/**
 * Drag strip on the sidebar's edge for the web and desktop builds. Plain
 * pointer events with pointer capture rather than PanResponder: react-native-
 * web ends a responder as soon as text gets selected, and WebKitGTK (the
 * Linux desktop app) ignores the unprefixed `user-select`, so a drag there
 * selected text and stopped after the first move.
 */
export function ResizeHandle({ lineColor, onStart, onMove, onEnd }: ResizeHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const end = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    setPageDragStyle(false);
    onEnd();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // Stops the press from starting a text selection or a native drag.
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        // Moves keep coming here even when the pointer runs ahead of the strip.
        e.currentTarget.setPointerCapture(e.pointerId);
        startX.current = e.clientX;
        setDragging(true);
        setPageDragStyle(true);
        onStart();
      }}
      onPointerMove={(e) => {
        if (startX.current !== null) onMove(e.clientX - startX.current);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: -HANDLE_WIDTH / 2,
        width: HANDLE_WIDTH,
        display: 'flex',
        justifyContent: 'center',
        cursor: 'col-resize',
        touchAction: 'none',
      }}
    >
      <div
        style={{
          width: 2,
          height: '100%',
          backgroundColor: hovered || dragging ? lineColor : 'transparent',
        }}
      />
    </div>
  );
}

/**
 * While dragging, keep the resize cursor anywhere on the page and don't
 * select text. WebKit (Safari, WebKitGTK) only knows the prefixed property.
 */
function setPageDragStyle(on: boolean) {
  const style = document.body.style;
  style.cursor = on ? 'col-resize' : '';
  style.userSelect = on ? 'none' : '';
  style.setProperty('-webkit-user-select', on ? 'none' : '');
}
