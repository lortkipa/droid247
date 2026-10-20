import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';

import { Sidebar } from './Sidebar';

const SLIDE_MS = 220;

type Props = { open: boolean; onClose: () => void };

/**
 * The sidebar on phones: slides in over the whole screen. Its close button, a
 * tab, or Android's back button closes it. Not rendered at all while closed,
 * so it's out of the way of screen readers and the keyboard.
 */
export function Drawer({ open, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const width = useWindowDimensions().width;

  const [mounted, setMounted] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) setMounted(true);
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: SLIDE_MS,
      // Only the transform animates, which the native driver can run (the web has none).
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, progress]);

  useEffect(() => {
    if (!open || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [open, onClose]);

  if (!mounted) return null;

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });

  return (
    <Animated.View
      accessibilityViewIsModal
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.surface,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          transform: [{ translateX }],
        },
      ]}
    >
      <Sidebar
        collapsed={false}
        topButton={{ icon: 'x', label: 'Close menu', onPress: onClose }}
        onNavigate={onClose}
      />
    </Animated.View>
  );
}
