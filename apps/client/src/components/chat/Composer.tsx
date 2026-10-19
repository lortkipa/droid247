import { useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { FadingScrollView } from '@/components/FadingScrollView';
import { IconButton } from '@/components/IconButton';
import { selectionProps } from '@/components/TextField';
import { pickFiles, type Attachment } from '@/lib/attachments';
import { canHover } from '@/lib/hover';
import { fonts, textMetrics, useTheme } from '@/lib/theme';

import { AttachmentTile } from './AttachmentTile';

const LINE_HEIGHT = 22;
const MAX_LINES = 8;
const BUTTON = 36;
/** Compact layout: room for a button and a gap on each side of the input. */
const SIDE = BUTTON + 8;
/** Expanded layout: the input's inset from the edges. */
const INSET = 6;
/** Room kept on the right for the scrollbar on the web (8px, see web-styles.web.ts). */
const SCROLLBAR = 8;
/**
 * On the web the textarea grows to its full height and a ScrollView around it
 * scrolls: a styled scrollbar takes the cursor of its element, so a textarea's
 * own scrollbar would show a text cursor. Phones scroll the input itself.
 */
const isWeb = Platform.OS === 'web';

type Props = {
  /** A reply is being written: Send turns into Stop. */
  streaming: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
};

/**
 * Message input. Compact by default (plus | text | send on one row); once the
 * text needs a second line it expands: text on top, plus and send in the
 * bottom corners. The TextInput itself never remounts (that would drop focus
 * and the caret), only its margins change while the buttons stay pinned to
 * the bottom corners.
 */
export function Composer({ streaming, onSend, onStop }: Props) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const fieldRef = useRef<ScrollView>(null);
  const caretAtEnd = useRef(true);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [width, setWidth] = useState(0);
  const [compactLines, setCompactLines] = useState(1);
  const [fullLines, setFullLines] = useState(1);

  const expanded = compactLines > 1;
  const visibleLines = expanded ? Math.min(fullLines, MAX_LINES) : 1;
  const inputLines = isWeb && expanded ? fullLines : visibleLines;
  const fullWidth = width - INSET - (isWeb ? SCROLLBAR : INSET);
  const canSend = !streaming && (text.trim() !== '' || attachments.length > 0);

  const send = () => {
    if (!canSend) return;
    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
    // A click on Send moves focus to the button; keep typing in the input.
    if (canHover) inputRef.current?.focus();
  };

  // Plus opens the system file picker straight away; any file type, images included.
  const attach = () => {
    pickFiles()
      .then((picked) => setAttachments((list) => [...list, ...picked]))
      // Picker failed: nothing was added.
      .catch(() => undefined);
  };

  // With a real keyboard (web and desktop), Enter sends and Shift+Enter adds a line.
  // Phones always add a line; they send with the button.
  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!canHover) return;
    // On the web this is a DOM keyboard event; React Native's type only declares `key`.
    const { key, shiftKey, isComposing } = e.nativeEvent as TextInputKeyPressEventData & {
      shiftKey?: boolean;
      isComposing?: boolean;
    };
    if (key === 'Enter' && !shiftKey && !isComposing) {
      e.preventDefault();
      send();
    }
  };

  // Web: the browser doesn't scroll the wrapper to follow the caret, so keep
  // the end in view while typing there (the usual case).
  const revealCaret = () => {
    if (isWeb && caretAtEnd.current) {
      requestAnimationFrame(() => fieldRef.current?.scrollToEnd({ animated: false }));
    }
  };

  const fieldStyle = expanded ? styles.fieldExpanded : styles.fieldCompact;
  const input = (
    <TextInput
      ref={inputRef}
      value={text}
      onChangeText={setText}
      onSelectionChange={(e) => {
        caretAtEnd.current = e.nativeEvent.selection.end >= text.length;
        revealCaret();
      }}
      onKeyPress={onKeyPress}
      multiline
      autoFocus={canHover}
      placeholder="Message Droid247"
      placeholderTextColor={theme.muted}
      accessibilityLabel="Message"
      {...selectionProps(theme)}
      scrollEnabled={!isWeb}
      style={[
        styles.input,
        { color: theme.text, height: inputLines * LINE_HEIGHT },
        isWeb && styles.noOverflow,
        expanded && (isWeb ? { width: fullWidth } : styles.inputInset),
      ]}
    />
  );

  return (
    <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {attachments.length > 0 && (
        <FadingScrollView
          horizontal
          wheelScrollsSideways
          fadeColor={theme.surface}
          fadeSize={20}
          containerStyle={styles.strip}
          contentContainerStyle={styles.stripContent}
          keyboardShouldPersistTaps="handled"
        >
          {attachments.map((attachment) => (
            <AttachmentTile
              key={attachment.id}
              attachment={attachment}
              onRemove={() => setAttachments((list) => list.filter((a) => a.id !== attachment.id))}
            />
          ))}
        </FadingScrollView>
      )}

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {isWeb ? (
          <ScrollView
            ref={fieldRef}
            style={[fieldStyle, { maxHeight: MAX_LINES * LINE_HEIGHT }]}
            onContentSizeChange={revealCaret}
            keyboardShouldPersistTaps="handled"
          >
            {input}
          </ScrollView>
        ) : (
          <View style={fieldStyle}>{input}</View>
        )}
        <View style={[styles.corner, styles.left]}>
          <IconButton
            icon="plus"
            label="Attach files"
            size={BUTTON}
            iconSize={20}
            onPress={attach}
          />
        </View>
        <View style={[styles.corner, styles.right]}>
          {streaming ? (
            <IconButton icon="stop" label="Stop" variant="filled" size={BUTTON} iconSize={16} onPress={onStop} />
          ) : (
            <IconButton
              icon="arrow-up"
              label="Send"
              // Fades to blue like the user's messages once there's something to send.
              variant="accent"
              size={BUTTON}
              iconSize={20}
              disabled={!canSend}
              onPress={send}
            />
          )}
        </View>
        <LineCount text={text} width={width - 2 * SIDE} onChange={setCompactLines} />
        <LineCount text={text} width={fullWidth} onChange={setFullLines} />
      </View>

    </View>
  );
}

/**
 * Counts how many lines `text` takes at `width` with the input's font, using
 * an invisible Text. Measuring this way (instead of the input's content size)
 * works the same on every platform and lets the layout decision depend only
 * on the compact width, so it can't flip back and forth.
 */
function LineCount({ text, width, onChange }: { text: string; width: number; onChange: (lines: number) => void }) {
  if (width <= 0) return null;
  return (
    <View
      style={styles.measure}
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text
        style={[styles.text, { width }]}
        onLayout={(e) => onChange(Math.max(1, Math.round(e.nativeEvent.layout.height / LINE_HEIGHT)))}
      >
        {/* The zero-width space gives a trailing newline its own line, as in the input. */}
        {`${text}​`}
      </Text>
    </View>
  );
}

const textStyle = { ...textMetrics, fontFamily: fonts.regular, fontSize: 16, lineHeight: LINE_HEIGHT };

const styles = StyleSheet.create({
  composer: { borderWidth: 1, borderRadius: 26, padding: 8 },
  strip: { marginBottom: 8 },
  stripContent: { gap: 8, paddingBottom: 2 },
  text: textStyle,
  input: {
    ...textStyle,
    padding: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
    // Web: no browser focus ring; the composer is clearly the input.
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  fieldCompact: { marginHorizontal: SIDE, marginVertical: (BUTTON - LINE_HEIGHT) / 2 },
  // Reaches the right edge, so the web scrollbar lines up with the send button's right edge.
  fieldExpanded: { marginLeft: INSET, marginTop: 6, marginBottom: BUTTON + 6 },
  inputInset: { marginRight: INSET },
  noOverflow: { overflow: 'hidden' },
  corner: { position: 'absolute', bottom: 0 },
  left: { left: 0 },
  right: { right: 0 },
  // Grows upwards from the composer's bottom so it never adds to the page's
  // height. No clipping box: Android lays out text in a clipped zero-height
  // box as zero high.
  measure: { position: 'absolute', bottom: 0, left: 0, opacity: 0 },
});
