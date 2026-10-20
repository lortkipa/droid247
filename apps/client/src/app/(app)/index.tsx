import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Composer } from '@/components/chat/Composer';
import { chatLayout } from '@/components/chat/layout';
import { MessageList } from '@/components/chat/MessageList';
import { AppHeader } from '@/components/sidebar/AppShell';
import { useChat } from '@/lib/chat';
import { useKeyboardVisible } from '@/lib/keyboard';

/** Gap between the composer and the bottom of the screen (or the keyboard). */
const BOTTOM_GAP = 12;

/** Home screen after sign-in (the Droid tab): the chat with the agent. */
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { messages, streaming, send, stop } = useChat();
  // The home indicator area is under the keyboard while it's open.
  const bottom = keyboardVisible ? BOTTOM_GAP : Math.max(insets.bottom, BOTTOM_GAP);

  return (
    <View style={styles.screen}>
      <AppHeader />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <MessageList messages={messages} />
        <View style={[chatLayout.column, { paddingBottom: bottom }]}>
          <Composer streaming={streaming} onSend={send} onStop={stop} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
