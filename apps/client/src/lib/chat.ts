import { useCallback, useEffect, useRef, useState } from 'react';

import type { Attachment } from './attachments';
import { fakeReply } from './fake-reply';
import { mockConversation } from './mock-chat';

export type UserMessage = { id: string; role: 'user'; text: string; attachments: Attachment[] };

export type AssistantMessage = {
  id: string;
  role: 'assistant';
  /** Markdown. */
  text: string;
  /** `thinking`: no text yet; `streaming`: text still arriving. */
  status: 'thinking' | 'streaming' | 'done';
};

export type ChatMessage = UserMessage | AssistantMessage;

const THINKING_MS = 600;
const CHUNK_MS = 30;

let lastId = 0;
function newMessageId(): string {
  lastId += 1;
  return `message-${lastId}`;
}

/**
 * The conversation on screen. For now everything is local: it starts with a
 * mocked conversation and replies are canned markdown, streamed a few words
 * at a time like a real model. Reloading the app starts over.
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockConversation);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replies = useRef(0);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const updateReply = useCallback((id: string, patch: Partial<AssistantMessage>) => {
    setMessages((list) =>
      list.map((m) => (m.id === id && m.role === 'assistant' ? { ...m, ...patch } : m)),
    );
  }, []);

  /** Streams a fake reply to `prompt` into assistant message `id`. */
  const streamReply = useCallback(
    (id: string, prompt: UserMessage | undefined) => {
      clearTimer();
      const reply = fakeReply(prompt?.text ?? '', prompt?.attachments ?? [], replies.current);
      replies.current += 1;
      // Words with the whitespace after them.
      const chunks = reply.match(/\S+\s*|\s+/g) ?? [];
      let shown = 0;
      const tick = () => {
        shown = Math.min(chunks.length, shown + 1 + Math.floor(Math.random() * 3));
        const done = shown >= chunks.length;
        updateReply(id, { text: chunks.slice(0, shown).join(''), status: done ? 'done' : 'streaming' });
        timer.current = done ? null : setTimeout(tick, CHUNK_MS);
      };
      timer.current = setTimeout(tick, THINKING_MS);
    },
    [clearTimer, updateReply],
  );

  const send = useCallback(
    (text: string, attachments: Attachment[]) => {
      const prompt: UserMessage = { id: newMessageId(), role: 'user', text, attachments };
      const reply: AssistantMessage = { id: newMessageId(), role: 'assistant', text: '', status: 'thinking' };
      setMessages((list) => [...list, prompt, reply]);
      streamReply(reply.id, prompt);
    },
    [streamReply],
  );

  /** Ends the reply being written, keeping what has arrived so far. */
  const stop = useCallback(() => {
    clearTimer();
    setMessages((list) =>
      list.map((m) =>
        m.role === 'assistant' && m.status !== 'done'
          ? { ...m, status: 'done', text: m.text || '*Stopped.*' }
          : m,
      ),
    );
  }, [clearTimer]);

  const streaming = messages.some((m) => m.role === 'assistant' && m.status !== 'done');

  return { messages, streaming, send, stop };
}
