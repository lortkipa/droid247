import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { typography, useTheme } from '@/lib/theme';

const DOTS = 3;
const STEP_MS = 160;

/** Three pulsing dots while a reply hasn't started yet. */
export function TypingIndicator() {
  const theme = useTheme();
  const values = useRef(Array.from({ length: DOTS }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const pulse = (value: Animated.Value) =>
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: STEP_MS * 2, useNativeDriver }),
        Animated.timing(value, { toValue: 0.3, duration: STEP_MS * 2, useNativeDriver }),
      ]);
    const loop = Animated.loop(Animated.stagger(STEP_MS, values.map(pulse)));
    loop.start();
    return () => loop.stop();
  }, [values]);

  return (
    <View style={styles.row} accessibilityLabel="Droid247 is thinking">
      {values.map((opacity, index) => (
        <Animated.View key={index} style={[styles.dot, { backgroundColor: theme.muted, opacity }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, height: typography.message.lineHeight },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
