import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FadingScrollView } from '@/components/FadingScrollView';
import { IconButton } from '@/components/IconButton';
import { typography, useTheme } from '@/lib/theme';
import { useCopy } from '@/lib/use-copy';

import { highlightCode } from './highlight';

/** Fenced code: language and copy button on top, highlighted code that scrolls sideways. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const theme = useTheme();
  const { copied, copy } = useCopy();
  const content = useMemo(() => highlightCode(code, language, theme.syntax), [code, language, theme.syntax]);

  return (
    <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[typography.small, { color: theme.muted }]}>{language?.trim() || 'text'}</Text>
        <IconButton
          icon={copied ? 'check' : 'copy'}
          label={copied ? 'Copied' : 'Copy code'}
          size={28}
          iconSize={16}
          onPress={() => copy(code)}
        />
      </View>
      <FadingScrollView
        horizontal
        fadeColor={theme.surface}
        fadeSize={20}
        contentContainerStyle={styles.content}
      >
        <Text selectable style={[typography.code, { color: theme.text }]}>
          {content}
        </Text>
      </FadingScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  header: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 4,
    borderBottomWidth: 1,
  },
  content: { paddingHorizontal: 14, paddingVertical: 12 },
});
