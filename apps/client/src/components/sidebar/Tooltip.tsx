import { StyleSheet, Text, View } from 'react-native';

import { fonts, textMetrics, useTheme } from '@/lib/theme';

/** Room the label may take; the bubble itself is only as wide as its text. */
const MAX_WIDTH = 280;

type Props = { label: string; detail?: string };

/**
 * Label to the right of a row in the collapsed sidebar, on hover. Place it
 * inside the hovered row; it sits just past the sidebar's edge.
 */
export function Tooltip({ label, detail }: Props) {
  const theme = useTheme();

  return (
    // A wide box so the text isn't squeezed: an absolute view would otherwise
    // shrink to the little room left of its parent and wrap every word.
    <View pointerEvents="none" style={styles.anchor}>
      <View style={[styles.bubble, { backgroundColor: theme.popover, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        {detail !== undefined && (
          <Text style={[styles.detail, { color: theme.muted }]} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: '100%',
    top: 0,
    bottom: 0,
    width: MAX_WIDTH,
    marginLeft: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { ...textMetrics, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  detail: { ...textMetrics, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
});
