import { Linking } from 'react-native';

/** Opens a link from chat content in the system browser (or the app that handles it). */
export async function openLink(url: string): Promise<void> {
  await Linking.openURL(url);
}
