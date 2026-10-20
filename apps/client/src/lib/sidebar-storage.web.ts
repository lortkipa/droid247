export type SidebarPrefs = { width: number; collapsed: boolean };

const KEY = 'droid247.sidebar';

/**
 * The sidebar's width and collapsed state, kept in this browser (or desktop
 * app). Storage can be missing or throw (private windows, blocked site data),
 * so failures fall back to the defaults.
 */
export function loadSidebarPrefs(): Partial<SidebarPrefs> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const { width, collapsed } = parsed as Record<string, unknown>;
    return {
      ...(typeof width === 'number' && Number.isFinite(width) ? { width } : {}),
      ...(typeof collapsed === 'boolean' ? { collapsed } : {}),
    };
  } catch {
    return {};
  }
}

export function saveSidebarPrefs(prefs: SidebarPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Not saved; the sidebar still works for this session.
  }
}
