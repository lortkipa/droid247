import { useState, type Ref } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, textMetrics, typography, useTheme, type Theme } from '@/lib/theme';

/**
 * Blue text selection like the browser default on web (where these props are
 * ignored). iOS uses one colour for caret, handles and selection; Android can
 * keep the caret in the text colour.
 */
function selectionProps(theme: Theme): TextInputProps {
  return Platform.select<TextInputProps>({
    android: {
      selectionColor: theme.selectionHighlight,
      selectionHandleColor: theme.selection,
      cursorColor: theme.text,
    },
    ios: { selectionColor: theme.selection },
    default: {},
  });
}

type Props = Omit<TextInputProps, 'style'> & {
  /** Message shown under the field; also turns the border red. */
  error?: string | null;
  ref?: Ref<TextInput>;
};

export function TextField({ error, onFocus, onBlur, ...props }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.danger : focused ? theme.text : theme.border;

  return (
    <View style={styles.wrapper}>
      <TextInput
        placeholderTextColor={theme.muted}
        {...selectionProps(theme)}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, { borderColor, color: theme.text }]}
      />
      {error ? <Text style={[typography.small, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch', gap: 8 },
  input: {
    ...textMetrics,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    // 16px keeps iOS Safari from zooming in on focus.
    fontSize: 16,
    // Web: the border already shows focus, so hide the browser's focus ring
    // ("auto" outlines ignore the width, hence the explicit style).
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
});
