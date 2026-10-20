import { useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';

import { FadingText } from '@/components/FadingText';
import { canHover } from '@/lib/hover';
import { fonts, textMetrics, useTheme } from '@/lib/theme';
import { useTransition } from '@/lib/use-transition';

import { Tooltip } from './Tooltip';

type Props = {
  /** Drawn in the given colour (muted, or full text colour when active or hovered). */
  icon: (color: string) => ReactNode;
  label: string;
  /** Shown under the label in the collapsed sidebar's tooltip. */
  detail?: string;
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
};

/** A tab in the sidebar: icon and label, or just the icon (with a tooltip) when collapsed. */
export function SidebarItem({ icon, label, detail, active, collapsed, onPress }: Props) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const hover = useTransition(hovered || pressed || active);
  const backgroundColor = hover.interpolate({
    inputRange: [0, 1],
    outputRange: [`${theme.surfaceHover}00`, theme.surfaceHover],
  });
  const color = active || hovered ? theme.text : theme.muted;

  return (
    <Animated.View style={[styles.row, { backgroundColor }]}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={[styles.pressable, Platform.OS === 'web' && { cursor: 'pointer' }]}
      >
        {icon(color)}
        {!collapsed && (
          <FadingText
            style={[styles.label, { color }]}
            containerStyle={styles.labelBox}
            // Same colours as the row's fill, so the fade matches it mid-hover too.
            fadeColor={theme.surface}
            overlayColor={theme.surfaceHover}
            overlayOpacity={hover}
          >
            {label}
          </FadingText>
        )}
      </Pressable>
      {collapsed && canHover && hovered && <Tooltip label={label} detail={detail} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { height: 40, borderRadius: 10 },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // Centres the 20px icon in the 40px collapsed row.
    paddingHorizontal: 10,
  },
  labelBox: { flex: 1 },
  label: { ...textMetrics, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
});
