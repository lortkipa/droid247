import type { MarkedToken, Token } from 'marked';
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { openLink } from '@/lib/open-link';
import { fonts, type Theme } from '@/lib/theme';

/** Only web and mail links open; anything else (e.g. `javascript:`) stays plain text. */
const OPENABLE_LINK = /^(https?:|mailto:)/i;

function linkProps(href: string) {
  return OPENABLE_LINK.test(href)
    ? { onPress: () => void openLink(href), accessibilityRole: 'link' as const }
    : {};
}

/** Inline markdown (emphasis, code, links, line breaks) as nested Text, inside a parent Text. */
export function renderInline(tokens: Token[] | undefined, theme: Theme): ReactNode[] {
  return (tokens ?? []).map((token, i) => {
    const t = token as MarkedToken;
    switch (t.type) {
      case 'strong':
        return (
          <Text key={i} style={styles.strong}>
            {renderInline(t.tokens, theme)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} style={styles.em}>
            {renderInline(t.tokens, theme)}
          </Text>
        );
      case 'del':
        return (
          <Text key={i} style={styles.del}>
            {renderInline(t.tokens, theme)}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} style={[styles.code, { backgroundColor: theme.surface }]}>
            {t.text}
          </Text>
        );
      case 'link':
        return (
          <Text key={i} style={[styles.link, { color: theme.link }]} {...linkProps(t.href)}>
            {renderInline(t.tokens, theme)}
          </Text>
        );
      case 'image':
        // Pictures from replies aren't shown inline yet; the alt text links to them.
        return (
          <Text key={i} style={[styles.link, { color: theme.link }]} {...linkProps(t.href)}>
            {t.text || t.href}
          </Text>
        );
      case 'br':
        return '\n';
      case 'checkbox':
        return null;
      case 'text':
        return t.tokens ? <Fragment key={i}>{renderInline(t.tokens, theme)}</Fragment> : t.text;
      default:
        return 'text' in t ? t.text : null;
    }
  });
}

const styles = StyleSheet.create({
  strong: { fontFamily: fonts.semibold },
  em: { fontStyle: 'italic' },
  del: { textDecorationLine: 'line-through' },
  code: { fontFamily: fonts.mono, fontSize: 14 },
  link: { textDecorationLine: 'underline' },
});
