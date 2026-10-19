import type { ChatMessage } from './chat';

/**
 * A made-up conversation shown after sign-in while the agent isn't connected,
 * covering everything messages can contain: markdown of every kind, code in
 * several languages, long and short user messages, and attachments.
 */

const capabilities = `# Hi! I'm Droid247 👋

I'm an AI agent with my **own cloud computer**, so I keep working when your devices are off. Things I'm good at:

- **Browsing the web**: research, comparing prices, filling in forms
- **Writing and running code** in a real Linux environment
- **Email and calendars**: triage, drafts, scheduling
  - with your approval before anything is sent
  - and a summary of what I did
- Long-running chores, like *watching a page for changes*

Here's how a typical task goes:

1. You describe what you want, from any device.
2. I plan it and get to work on my computer.
3. You get a notification when it's done, or when I need you.

Things I can track for you:

- [x] Book the dentist appointment
- [x] Renew the domain name
- [ ] File the expense report
- [ ] Compare flights to Lisbon

> **Tip:** you can watch me work live and take over the mouse and keyboard at any time.

Formatting works too: ~~strikethrough~~, \`inline code\`, ***bold italics*** and [links](https://en.wikipedia.org/wiki/Markdown).`;

const report = `Here's the summary of **Q3** from the report and the spreadsheet:

| Region | Revenue | Growth | Target met |
| :--- | ---: | ---: | :---: |
| Europe | $1.24M | +18% | Yes |
| North America | $2.05M | +9% | Yes |
| Asia Pacific | $0.87M | +31% | Yes |
| Latin America | $0.32M | −4% | No |
| **Total** | **$4.48M** | **+13%** | |

### Highlights

1. **Asia Pacific** grew fastest, mostly from the new enterprise plan.
2. **Latin America** is the only region below target; churn rose in August.
3. Margins held steady at about *61%*.

---

This is the query I used on the raw data:

\`\`\`sql
SELECT region,
       SUM(revenue)                         AS revenue,
       ROUND(100.0 * (SUM(revenue) - SUM(prev_revenue)) / SUM(prev_revenue)) AS growth_pct
FROM quarterly_sales
WHERE quarter = '2026-Q3'
GROUP BY region
ORDER BY revenue DESC;
\`\`\``;

const code = `Here's a version in each language you asked for. All of them retry up to 3 times with exponential backoff.

**TypeScript**

\`\`\`typescript
type Task<T> = () => Promise<T>;

export async function withRetry<T>(task: Task<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      await sleep(2 ** i * 250); // 250ms, 500ms, 1s
    }
  }
  throw lastError;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
\`\`\`

**Python**

\`\`\`python
import time
from typing import Callable, TypeVar

T = TypeVar("T")

def with_retry(task: Callable[[], T], attempts: int = 3) -> T:
    """Run task, retrying with exponential backoff."""
    for i in range(attempts):
        try:
            return task()
        except Exception:
            if i == attempts - 1:
                raise
            time.sleep(2 ** i * 0.25)
\`\`\`

**Rust**

\`\`\`rust
use std::{thread, time::Duration};

fn with_retry<T, E>(mut task: impl FnMut() -> Result<T, E>, attempts: u32) -> Result<T, E> {
    let mut i = 0;
    loop {
        match task() {
            Ok(value) => return Ok(value),
            Err(err) if i + 1 >= attempts => return Err(err),
            Err(_) => thread::sleep(Duration::from_millis(250 * 2u64.pow(i))),
        }
        i += 1;
    }
}
\`\`\`

**Go**

\`\`\`go
func WithRetry[T any](task func() (T, error), attempts int) (T, error) {
	var zero T
	var err error
	for i := 0; i < attempts; i++ {
		var value T
		if value, err = task(); err == nil {
			return value, nil
		}
		time.Sleep(time.Duration(250<<i) * time.Millisecond)
	}
	return zero, err
}
\`\`\`

To run it every hour on your machine, add this cron entry:

\`\`\`bash
# Fetch the latest prices every hour and keep a log
0 * * * * cd ~/prices && ./fetch.sh >> ~/prices/fetch.log 2>&1
\`\`\`

And the config it reads:

\`\`\`json
{
  "sources": ["https://example.com/api/prices"],
  "retry": { "attempts": 3, "baseDelayMs": 250 },
  "notify": true
}
\`\`\`

Finally, the change I made to the existing script:

\`\`\`diff
- curl -s "$URL" > prices.json
+ curl -s --retry 3 --retry-delay 1 "$URL" > prices.json
\`\`\``;

export const mockConversation: ChatMessage[] = [
  { id: 'mock-1', role: 'user', text: 'Hey! What can you do while my laptop is off?', attachments: [] },
  { id: 'mock-2', role: 'assistant', status: 'done', text: capabilities },
  {
    id: 'mock-3',
    role: 'user',
    text: "Here's last quarter's report, the raw data and two images from the dashboard. Can you summarise the numbers by region?",
    attachments: [
      { id: 'mock-attachment-1', kind: 'image', name: 'icon.png', source: require('../../assets/icon-1024.png') },
      { id: 'mock-attachment-2', kind: 'image', name: 'banner.png', source: require('../../assets/og-image.png') },
      { id: 'mock-attachment-3', kind: 'file', name: 'Q3-report.pdf', mimeType: 'application/pdf', size: 2_516_582 },
      { id: 'mock-attachment-4', kind: 'file', name: 'sales-data.csv', mimeType: 'text/csv', size: 48_310 },
    ],
  },
  { id: 'mock-4', role: 'assistant', status: 'done', text: report },
  {
    id: 'mock-5',
    role: 'user',
    text: "Great, thanks. Next, I need a small helper that retries a flaky network call a few times before giving up, with a growing delay between attempts. Please write it in TypeScript, Python, Rust and Go so I can compare them, and show me how to run the fetch script every hour on the server. Also, what's the config format?",
    attachments: [],
  },
  { id: 'mock-6', role: 'assistant', status: 'done', text: code },
  { id: 'mock-7', role: 'user', text: 'Perfect 🙌', attachments: [] },
  {
    id: 'mock-8',
    role: 'assistant',
    status: 'done',
    text: "Glad it helps! I'll set up the hourly job and let you know once the first run finishes.",
  },
];
