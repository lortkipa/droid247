import { memo } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import type { AssistantMessage as Message } from '@/lib/chat';

import { TypingIndicator } from './TypingIndicator';

/** A reply: plain markdown across the full column. */
export const AssistantMessage = memo(function AssistantMessage({ message }: { message: Message }) {
  return message.status === 'thinking' ? <TypingIndicator /> : <Markdown text={message.text} />;
});
