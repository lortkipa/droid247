import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { Attachment } from '@/lib/attachments';
import { fonts, textMetrics, useTheme } from '@/lib/theme';

export const TILE_SIZE = 80;

/** Fixed-size square for one attachment: the picture itself, or a file icon with the name. */
export function AttachmentTile({ attachment, onRemove }: { attachment: Attachment; onRemove?: () => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.tile, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {attachment.kind === 'image' ? (
        <Image
          source={attachment.source}
          resizeMode="cover"
          style={styles.image}
          accessibilityLabel={attachment.name}
        />
      ) : (
        <View style={styles.file} accessibilityLabel={attachment.name}>
          <Icon name="file" size={22} color={theme.muted} />
          <Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>
            {attachment.name}
          </Text>
        </View>
      )}
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${attachment.name}`}
          style={[styles.remove, Platform.OS === 'web' && { cursor: 'pointer' }]}
        >
          <Icon name="x" size={12} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Explicit size: on the web a bundled image otherwise keeps its own pixel size.
  image: { width: '100%', height: '100%' },
  file: { flex: 1, padding: 10, justifyContent: 'space-between' },
  name: { ...textMetrics, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
});
