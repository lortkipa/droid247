import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, textMetrics, useTheme } from '@/lib/theme';
import { useTransition } from '@/lib/use-transition';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Shows a spinner instead of the title and ignores presses. */
  loading?: boolean;
  /** Shown before the title, e.g. a provider logo. */
  icon?: ReactNode;
};

export const DISABLED_OPACITY = 0.4;

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, icon }: Props) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  // Phones have no hover, so a touch shows the hover shade instead.
  const [pressed, setPressed] = useState(false);
  const filled = variant === 'primary';
  const labelColor = filled ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;

  // A loading button ignores presses but keeps its full colour.
  const inactive = disabled || loading;
  const enabled = useTransition(!disabled || loading);
  const hover = useTransition((hovered || pressed) && !inactive);

  const opacity = enabled.interpolate({ inputRange: [0, 1], outputRange: [DISABLED_OPACITY, 1] });
  const backgroundColor = hover.interpolate({
    inputRange: [0, 1],
    outputRange: filled
      ? [theme.primary, theme.primaryHover]
      : // Transparent version of the hover colour, so the fade doesn't pass through grey.
        [`${theme.outlineHover}00`, theme.outlineHover],
  });

  return (
    <Animated.View
      // Android fades each layer separately otherwise (border ring, washed-out
      // label); this fades the button as one image, like web and iOS.
      needsOffscreenAlphaCompositing
      style={[
        styles.button,
        // Filled buttons keep border and fill the same colour so hover leaves no ring.
        { opacity, backgroundColor, borderColor: filled ? backgroundColor : theme.border },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={inactive}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={[
          styles.pressable,
          Platform.OS === 'web' && { cursor: inactive ? 'auto' : 'pointer' },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { marginRight: 10 },
  label: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 16 },
});
