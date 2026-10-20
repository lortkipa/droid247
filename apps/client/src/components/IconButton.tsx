import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';

import { DISABLED_OPACITY } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/lib/theme';
import { useTransition } from '@/lib/use-transition';

/** How long Send takes to turn blue or back. */
const ACCENT_FADE_MS = 100;

type Props = {
  icon: IconName;
  /** Read by screen readers. */
  label: string;
  onPress: () => void;
  /**
   * `filled`: primary colours. `accent`: the user-bubble blue when enabled,
   * crossfading slowly to and from the dimmed `filled` look when disabled.
   * `ghost`: transparent until hovered.
   */
  variant?: 'filled' | 'accent' | 'ghost';
  /** Diameter of the round button. */
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  /** `ghost` only: the hover fill, for buttons on a surface other than the background. */
  hoverColor?: string;
};

/** Round icon-only button with the same hover/press shading as Button. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'ghost',
  size = 32,
  iconSize = 18,
  disabled = false,
  hoverColor,
}: Props) {
  const theme = useTheme();
  const ghostHover = hoverColor ?? theme.outlineHover;
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = (hovered || pressed) && !disabled;

  const accent = variant === 'accent';
  // One value drives the whole enable/disable change, so the dimming and the
  // blue fade together instead of one jumping ahead of the other.
  const enabled = useTransition(!disabled, accent ? { duration: ACCENT_FADE_MS } : undefined);
  const hover = useTransition(active);
  const opacity = enabled.interpolate({ inputRange: [0, 1], outputRange: [DISABLED_OPACITY, 1] });
  const ghost = variant === 'ghost';
  // `accent` keeps the `filled` look underneath and fades a blue layer (with its
  // own white icon) over it, rather than switching colours, which would jump.
  const backgroundColor = hover.interpolate({
    inputRange: [0, 1],
    outputRange: ghost
      ? [`${ghostHover}00`, ghostHover]
      : [theme.primary, theme.primaryHover],
  });
  const accentColor = hover.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.userBubble, theme.userBubbleHover],
  });
  const iconColor = ghost ? (active ? theme.text : theme.muted) : theme.onPrimary;

  return (
    <Animated.View
      needsOffscreenAlphaCompositing
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2, opacity, backgroundColor },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[styles.pressable, Platform.OS === 'web' && { cursor: disabled ? 'auto' : 'pointer' }]}
      >
        <Icon name={icon} size={iconSize} color={iconColor} />
      </Pressable>
      {accent && (
        <Animated.View
          pointerEvents="none"
          style={[styles.layer, { backgroundColor: accentColor, opacity: enabled }]}
        >
          <Icon name={icon} size={iconSize} color={theme.onUserBubble} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { overflow: 'hidden' },
  pressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
