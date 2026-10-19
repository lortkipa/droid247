import { marked, type MarkedToken, type Token, type Tokens } from 'marked';
import { createContext, memo, useContext, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { fonts, textMetrics, typography, useTheme } from '@/lib/theme';

import { CodeBlock } from './CodeBlock';
import { renderInline } from './inline';
import { Table } from './Table';

/** Text colour inside a block, when it differs from the theme's (blockquotes). */
const TextColor = createContext<string | null>(null);

/**
 * Renders markdown (GitHub flavour, single newlines kept as line breaks) with
 * native components, so replies look the same on every platform.
 */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const tokens = useMemo(() => marked.lexer(text, { gfm: true, breaks: true }), [text]);
  return <Blocks tokens={tokens} gap={12} listDepth={0} />;
});

function Blocks({ tokens, gap, listDepth }: { tokens: Token[]; gap: number; listDepth: number }) {
  const blocks = tokens.filter((t) => t.type !== 'space' && t.type !== 'checkbox');
  return (
    <View style={{ gap }}>
      {blocks.map((token, index) => (
        <Block key={index} token={token as MarkedToken} first={index === 0} listDepth={listDepth} />
      ))}
    </View>
  );
}

function Block({ token, first, listDepth }: { token: MarkedToken; first: boolean; listDepth: number }) {
  const theme = useTheme();
  switch (token.type) {
    case 'paragraph':
      return <Paragraph tokens={token.tokens} />;
    case 'text':
      return <Paragraph tokens={token.tokens ?? [token]} />;
    case 'heading':
      return <Heading token={token} first={first} />;
    case 'code':
      return <CodeBlock code={token.text} language={token.lang} />;
    case 'blockquote':
      return (
        <View style={[styles.quote, { borderLeftColor: theme.border }]}>
          <TextColor.Provider value={theme.muted}>
            <Blocks tokens={token.tokens} gap={12} listDepth={listDepth} />
          </TextColor.Provider>
        </View>
      );
    case 'list':
      return <List token={token} depth={listDepth} />;
    case 'table':
      return <Table token={token} />;
    case 'hr':
      return <View style={[styles.hr, { backgroundColor: theme.border }]} />;
    default:
      // Raw HTML and anything unexpected: show the text as written.
      return 'text' in token ? <Paragraph tokens={[{ type: 'text', raw: token.raw, text: token.text }]} /> : null;
  }
}

function Paragraph({ tokens }: { tokens: Token[] }) {
  const theme = useTheme();
  const color = useContext(TextColor) ?? theme.text;
  return (
    <Text selectable style={[typography.message, { color }]}>
      {renderInline(tokens, theme)}
    </Text>
  );
}

function Heading({ token, first }: { token: Tokens.Heading; first: boolean }) {
  const theme = useTheme();
  const color = useContext(TextColor) ?? theme.text;
  const level = Math.min(token.depth, 4) as 1 | 2 | 3 | 4;
  return (
    <Text
      selectable
      accessibilityRole="header"
      style={[headingStyles[level], { color }, !first && styles.headingSpace]}
    >
      {renderInline(token.tokens, theme)}
    </Text>
  );
}

function List({ token, depth }: { token: Tokens.List; depth: number }) {
  const theme = useTheme();
  const color = useContext(TextColor) ?? theme.text;
  const start = typeof token.start === 'number' ? token.start : 1;
  const gap = token.loose ? 8 : 4;

  return (
    <View style={{ gap }}>
      {token.items.map((item, index) => (
        <View key={index} style={styles.item}>
          <View style={[styles.marker, token.ordered && !item.task && styles.numberMarker]}>
            {item.task ? (
              <Checkbox checked={item.checked ?? false} />
            ) : token.ordered ? (
              <Text style={[typography.message, { color }]}>{start + index}.</Text>
            ) : (
              <Bullet depth={depth} color={color} />
            )}
          </View>
          <View style={styles.itemBody}>
            <Blocks tokens={item.tokens} gap={gap} listDepth={depth + 1} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Filled dot, then ring, then square for deeper lists. Drawn, not typed, so no font lacks the glyph. */
function Bullet({ depth, color }: { depth: number; color: string }) {
  const kind = depth % 3;
  return (
    <View
      style={[
        styles.bullet,
        kind === 0 && { backgroundColor: color },
        kind === 1 && { borderWidth: 1.5, borderColor: color },
        kind === 2 && { backgroundColor: color, borderRadius: 1 },
      ]}
    />
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[
        styles.checkbox,
        checked
          ? { backgroundColor: theme.userBubble, borderColor: theme.userBubble }
          : { borderColor: theme.muted },
      ]}
    >
      {checked && <Icon name="check" size={12} color={theme.onUserBubble} />}
    </View>
  );
}

const headingStyles = {
  1: { ...textMetrics, fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  2: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 },
  3: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 },
  4: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
} as const;

const LINE = typography.message.lineHeight;

const styles = StyleSheet.create({
  headingSpace: { marginTop: 8 },
  quote: { borderLeftWidth: 3, paddingLeft: 12 },
  hr: { height: 1, marginVertical: 4 },
  item: { flexDirection: 'row' },
  // As tall as the first line, so markers sit centred on it.
  marker: { width: 24, height: LINE, alignItems: 'center', justifyContent: 'center' },
  numberMarker: { width: 'auto', minWidth: 24, alignItems: 'flex-start', paddingRight: 6 },
  itemBody: { flex: 1 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
