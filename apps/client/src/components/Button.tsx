import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, textMetrics, useTheme } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Shown before the title, e.g. a provider logo. */
  icon?: ReactNode;
};

const TRANSITION_MS = 150;
const DISABLED_OPACITY = 0.4;
// Colour animations can't run on the native driver; the web has none at all.
const useNativeDriver = false;

/** Fades between 0 and 1 whenever `on` changes. */
function useTransition(on: boolean): Animated.Value {
  const value = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: on ? 1 : 0,
      duration: TRANSITION_MS,
      useNativeDriver,
    }).start();
  }, [on, value]);
  return value;
}

export function Button({ title, onPress, variant = 'primary', disabled = false, icon }: Props) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  // Phones have no hover, so a touch shows the hover shade instead.
  const [pressed, setPressed] = useState(false);
  const filled = variant === 'primary';
  const labelColor = filled ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;

  const enabled = useTransition(!disabled);
  const hover = useTransition((hovered || pressed) && !disabled);

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
        disabled={disabled}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[
          styles.pressable,
          Platform.OS === 'web' && { cursor: disabled ? 'auto' : 'pointer' },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
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
