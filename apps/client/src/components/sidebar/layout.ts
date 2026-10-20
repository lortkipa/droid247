/** Width of the collapsed sidebar: icons only. */
export const RAIL_WIDTH = 64;

/** Expanded width: the default and the range it can be dragged to. */
export const DEFAULT_WIDTH = 260;
export const MIN_WIDTH = 200;
export const MAX_WIDTH = 400;

/** Dragging the sidebar narrower than this collapses it (and wider expands it again). */
export const COLLAPSE_BELOW = 160;

/** Narrower windows (phones) get a drawer instead of a docked sidebar. */
export const DOCK_MIN_WINDOW = 768;

/** Narrower windows collapse the docked sidebar, so the chat keeps its room. */
export const AUTO_COLLAPSE_BELOW = 1024;

/**
 * Space between the sidebar's edges and its rows. Rows keep their icons at the
 * same spot in both states, so collapsing doesn't move them.
 */
export const SIDEBAR_PADDING = 12;

export function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}
