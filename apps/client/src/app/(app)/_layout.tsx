import { Slot } from 'expo-router';

import { AppShell } from '@/components/sidebar/AppShell';
import { ChatProvider } from '@/lib/chat';

/** Signed-in screens: the chat and settings, side by side with the sidebar. */
export default function AppLayout() {
  return (
    <ChatProvider>
      <AppShell>
        <Slot />
      </AppShell>
    </ChatProvider>
  );
}
