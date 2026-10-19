/**
 * Whether the main pointer can hover (mouse or trackpad). Phone and tablet
 * browsers can't, so they get the same long-press menus as the apps.
 */
export const canHover =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover)').matches
    : true;
