import * as DocumentPicker from 'expo-document-picker';
import { Platform, type ImageSourcePropType } from 'react-native';

/** A file added to a message. Images show as pictures, anything else as an icon with its name. */
export type Attachment =
  | { id: string; kind: 'image'; name: string; source: ImageSourcePropType; size?: number }
  | { id: string; kind: 'file'; name: string; mimeType?: string; size?: number };

let lastId = 0;
export function newAttachmentId(): string {
  lastId += 1;
  return `attachment-${lastId}`;
}

/** Opens the system file picker for any files; picked images show as pictures. */
export async function pickFiles(): Promise<Attachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    // Web: no type at all, so the file input gets no `accept` filter. The
    // default `*/*` becomes a filter that the Linux desktop's file chooser
    // (through the portal) matches no files with, showing only folders.
    type: Platform.OS === 'web' ? [] : '*/*',
    multiple: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset): Attachment => {
    const base = { id: newAttachmentId(), name: asset.name, size: asset.size };
    return asset.mimeType?.startsWith('image/')
      ? { ...base, kind: 'image', source: { uri: asset.uri } }
      : { ...base, kind: 'file', mimeType: asset.mimeType };
  });
}

/** "2.4 MB" style size. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
