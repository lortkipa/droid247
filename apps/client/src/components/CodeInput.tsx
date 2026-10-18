import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { fonts, textMetrics, useTheme } from '@/lib/theme';

type Props = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once every box is filled. */
  onComplete: (code: string) => void;
  /** Red boxes and no more typing. */
  error?: boolean;
  autoFocus?: boolean;
};

/**
 * One box per digit. A single transparent TextInput sits on top of the boxes,
 * so typing, pasting and one-time-code autofill work the same on every platform.
 */
export function CodeInput({ length, value, onChange, onComplete, error = false, autoFocus }: Props) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (error) {
      inputRef.current?.blur();
    }
  }, [error]);

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const active = focused && !error && i === activeIndex;
        const borderColor = error ? theme.danger : active ? theme.text : theme.border;
        return (
          <View key={i} style={[styles.box, { borderColor }]}>
            {value[i] ? (
              <Text style={[styles.digit, { color: theme.text }]}>{value[i]}</Text>
            ) : active ? (
              <Caret color={theme.text} />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, length);
          onChange(digits);
          if (digits.length === length) {
            onComplete(digits);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!error}
        autoFocus={autoFocus}
        maxLength={length}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden
        // Keep the cursor at the end so a tap on an earlier box can't insert mid-code.
        selection={{ start: value.length, end: value.length }}
        accessibilityLabel="Verification code"
        style={styles.hiddenInput}
      />
    </View>
  );
}

function Caret({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 0, delay: 500, useNativeDriver }),
        Animated.timing(opacity, { toValue: 1, duration: 0, delay: 500, useNativeDriver }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);

  return <Animated.View style={[styles.caret, { backgroundColor: color, opacity }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { ...textMetrics, fontFamily: fonts.medium, fontSize: 22 },
  caret: { width: 2, height: 24, borderRadius: 1 },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    color: 'transparent',
    // 16px keeps iOS Safari from zooming in on focus.
    fontSize: 16,
  },
});
