import { isDesktop } from './platform';

/** Opens a link from chat content outside the app: a new browser tab, or the system browser on desktop. */
export async function openLink(url: string): Promise<void> {
  if (isDesktop) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
