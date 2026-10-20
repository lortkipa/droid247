export type SidebarPrefs = { width: number; collapsed: boolean };

/**
 * Phones use the drawer, which has nothing to remember; tablets start from
 * the defaults each launch.
 */
export function loadSidebarPrefs(): Partial<SidebarPrefs> {
  return {};
}

export function saveSidebarPrefs(_prefs: SidebarPrefs): void {}
