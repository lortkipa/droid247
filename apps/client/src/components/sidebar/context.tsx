import { usePathname } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import type { Expression } from '@/components/Logo';
import { useChat } from '@/lib/chat';

export type SidebarContextValue = {
  /** Docked beside the content (wide windows) rather than a drawer (phones). */
  docked: boolean;
  openDrawer: () => void;
  /** The agent's state, shown by the eyes on the Droid tab. */
  status: Expression;
};

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const value = useContext(SidebarContext);
  if (!value) {
    throw new Error('useSidebar must be used inside <AppShell>');
  }
  return value;
}

/**
 * `working` while a reply streams; `done` when one finished while the user
 * was on another tab, until they open the chat again; otherwise `idle`.
 */
export function useDroidStatus(): Expression {
  const { streaming } = useChat();
  const onChat = usePathname() === '/';
  const [unseen, setUnseen] = useState(false);
  const wasStreaming = useRef(streaming);

  useEffect(() => {
    if (wasStreaming.current && !streaming && !onChat) setUnseen(true);
    wasStreaming.current = streaming;
  }, [streaming, onChat]);

  useEffect(() => {
    if (onChat) setUnseen(false);
  }, [onChat]);

  if (streaming) return 'working';
  return unseen ? 'done' : 'idle';
}

export const statusLabels: Record<Expression, string | undefined> = {
  idle: undefined,
  working: 'Working…',
  done: 'Reply ready',
};
