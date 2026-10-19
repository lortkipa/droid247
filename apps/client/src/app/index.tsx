import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Composer } from '@/components/chat/Composer';
import { chatLayout } from '@/components/chat/layout';
import { MessageList } from '@/components/chat/MessageList';
import { Header } from '@/components/Header';
import { useChat } from '@/lib/chat';
import { useKeyboardVisible } from '@/lib/keyboard';
import { useTheme } from '@/lib/theme';

/** Gap between the composer and the bottom of the screen (or the keyboard). */
const BOTTOM_GAP = 12;

/** Home screen after sign-in: the chat with the agent. */
export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { messages, streaming, send, stop } = useChat();
  // The home indicator area is under the keyboard while it's open.
  const bottom = keyboardVisible ? BOTTOM_GAP : Math.max(insets.bottom, BOTTOM_GAP);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <Header />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <MessageList messages={messages} />
        <View style={[chatLayout.column, { paddingBottom: bottom }]}>
          <Composer streaming={streaming} onSend={send} onStop={stop} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
