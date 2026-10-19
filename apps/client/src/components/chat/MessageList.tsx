import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, type ScrollView } from 'react-native';

import { FadingScrollView } from '@/components/FadingScrollView';
import type { ChatMessage } from '@/lib/chat';
import { useTheme } from '@/lib/theme';

import { AssistantMessage } from './AssistantMessage';
import { chatLayout } from './layout';
import { UserMessage } from './UserMessage';

/** How close to the bottom (px) still counts as "at the bottom" for following new text. */
const FOLLOW_THRESHOLD = 80;

type Props = { messages: ChatMessage[] };

/**
 * The conversation, newest at the bottom. It opens scrolled to the end and
 * follows a reply as it streams in, unless the user has scrolled up to read.
 */
export function MessageList({ messages }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const following = useRef(true);
  const lastOffset = useRef(0);

  const followEnd = () => {
    if (!following.current) return;
    // Next frame: Android applies the new content size to the scroll view only
    // after this callback, and scrolling now would stop short of the end.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
  };

  // A new message always brings the end into view, once
  // its layout changes the content size.
  useEffect(() => {
    following.current = true;
  }, [messages.length]);

  return (
    <FadingScrollView
      ref={scrollRef}
      fadeColor={theme.background}
      fadeSize={32}
      containerStyle={styles.fill}
      style={styles.fill}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      // Phones only: react-native-web treats every scroll as a drag, so the
      // input would lose focus whenever the list scrolls itself (composer
      // growing, reply streaming in).
      keyboardDismissMode={Platform.select({ ios: 'interactive', android: 'on-drag', default: 'none' })}
      onScroll={(e) => {
        const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
        const offset = contentOffset.y;
        // Only the user scrolling up stops following. Judging by distance alone
        // fails when content grows by more than the threshold between events.
        if (offset + layoutMeasurement.height >= contentSize.height - FOLLOW_THRESHOLD) {
          following.current = true;
        } else if (offset < lastOffset.current) {
          following.current = false;
        }
        lastOffset.current = offset;
      }}
      onContentSizeChange={followEnd}
      // The view gets shorter when the composer grows or the keyboard opens; stay at the end.
      onLayout={followEnd}
    >
      <View style={[chatLayout.column, styles.messages]}>
        {messages.map((message) =>
          message.role === 'user' ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AssistantMessage key={message.id} message={message} />
          ),
        )}
      </View>
    </FadingScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 24 },
  messages: { gap: 24 },
});
