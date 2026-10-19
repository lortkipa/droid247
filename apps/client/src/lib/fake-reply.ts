import { formatSize, type Attachment } from './attachments';

/** Backslash-escapes markdown syntax so user text shows as typed. */
function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|>~<]/g, '\\$&');
}

function quote(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const short = firstLine.length > 80 ? `${firstLine.slice(0, 80).trimEnd()}…` : firstLine;
  return escapeMarkdown(short);
}

function attachmentTable(attachments: Attachment[]): string {
  const rows = attachments.map((a) => {
    const type = a.kind === 'image' ? 'Image' : (a.mimeType ?? 'File');
    const size = a.size === undefined ? '—' : formatSize(a.size);
    return `| ${escapeMarkdown(a.name)} | ${escapeMarkdown(type)} | ${size} |`;
  });
  const count = attachments.length === 1 ? '1 attachment' : `${attachments.length} attachments`;
  return [`Thanks, I got **${count}**:`, '', '| File | Type | Size |', '| --- | --- | --- |', ...rows].join(
    '\n',
  );
}

const bodies: ((topic: string) => string)[] = [
  (topic) => `Got it. Here's the plan${topic ? ` for **${topic}**` : ''}:

1. Break the task into small steps.
2. Work through them on your cloud computer.
3. Report back here when it's done, even if you've closed the app.

I'll keep going in the background, so you can check on progress any time.`,

  (topic) => `Sure! Here's a small helper to start with${topic ? ` for **${topic}**` : ''}:

\`\`\`typescript
export async function retry<T>(task: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100));
    }
  }
}
\`\`\`

Want me to wire it into the project and run the tests?`,

  (topic) => `On it. Quick status${topic ? ` on *${topic}*` : ''}:

| Step | Status | ETA |
| :--- | :---: | ---: |
| Research | Done | — |
| Draft | In progress | ~10 min |
| Review | Waiting | ~20 min |

> You can close the app. I'll send a notification when it's finished.`,

  (topic) => `Good question. A few things to keep in mind${topic ? ` about **${topic}**` : ''}:

- **Speed:** most of this can run in parallel.
- **Cost:** it stays well inside your plan's limits.
- **Safety:** nothing leaves your own virtual machine.
  - Logins and files persist between tasks.
  - You can watch live and take over at any time.

Shall I start?`,
];

/** A canned markdown reply to `text` (rotating through a few shapes) until the real agent is connected. */
export function fakeReply(text: string, attachments: Attachment[], index: number): string {
  const body = bodies[index % bodies.length] ?? bodies[0]!;
  const parts = [body(quote(text.trim()))];
  if (attachments.length > 0) parts.unshift(attachmentTable(attachments));
  parts.push("*This is a mocked reply; the real agent isn't connected yet.*");
  return parts.join('\n\n');
}
