import type { Tokens } from 'marked';
import { StyleSheet, Text, View } from 'react-native';

import { FadingScrollView } from '@/components/FadingScrollView';
import { fonts, textMetrics, useTheme } from '@/lib/theme';

import { renderInline } from './inline';

const CHAR_WIDTH = 8;
const CELL_PADDING = 12;
const MIN_COLUMN = 72;
const MAX_COLUMN = 280;

/**
 * Column widths guessed from the longest cell. Every row uses the same width
 * as both basis and grow factor, so columns line up and a narrow table still
 * fills the message width; a wide one scrolls sideways.
 */
function columnWidths(table: Tokens.Table): number[] {
  return table.header.map((_, column) => {
    const cells = [table.header[column], ...table.rows.map((row) => row[column])];
    const longest = Math.max(...cells.map((cell) => cell?.text.length ?? 0));
    return Math.min(MAX_COLUMN, Math.max(MIN_COLUMN, longest * CHAR_WIDTH + CELL_PADDING * 2));
  });
}

export function Table({ token }: { token: Tokens.Table }) {
  const theme = useTheme();
  const widths = columnWidths(token);

  return (
    <FadingScrollView
      horizontal
      fadeColor={theme.background}
      fadeSize={20}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.table, { borderColor: theme.border }]}>
        <Row cells={token.header} widths={widths} header />
        {token.rows.map((row, index) => (
          <Row key={index} cells={row} widths={widths} />
        ))}
      </View>
    </FadingScrollView>
  );
}

function Row({ cells, widths, header = false }: { cells: Tokens.TableCell[]; widths: number[]; header?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        header ? { backgroundColor: theme.surface } : { borderTopWidth: 1, borderTopColor: theme.border },
      ]}
    >
      {widths.map((width, column) => {
        const cell = cells[column];
        return (
          <View
            key={column}
            style={[
              styles.cell,
              { flexBasis: width, flexGrow: width },
              column > 0 && { borderLeftWidth: 1, borderLeftColor: theme.border },
            ]}
          >
            <Text
              selectable
              style={[
                header ? styles.headerText : styles.text,
                { color: theme.text, textAlign: cell?.align ?? 'left' },
              ]}
            >
              {renderInline(cell?.tokens, theme)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  table: { flexGrow: 1, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { flexShrink: 0, paddingHorizontal: CELL_PADDING, paddingVertical: 8 },
  text: { ...textMetrics, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  headerText: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
});
