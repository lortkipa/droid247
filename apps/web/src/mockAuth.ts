/**
 * Stand-in for the auth API, which the server doesn't have yet. Every call
 * fakes network latency. Replace these with `@droid247/client` calls once
 * the backend grows auth endpoints; the UI only depends on these signatures.
 */

/** The only code `verifyCode` accepts. */
export const MOCK_CODE = "123456";

const MOCK_GOOGLE_USER = { name: "Alex Morgan", email: "alex.morgan@gmail.com" };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Emails a one-time sign-in code. */
export async function sendCode(_email: string): Promise<void> {
  await wait(900);
}

/** Checks a one-time code. Codes are single-use, so a wrong guess burns it. */
export async function verifyCode(_email: string, code: string): Promise<boolean> {
  await wait(1000);
  return code === MOCK_CODE;
}

export async function signInWithGoogle(): Promise<{ name: string; email: string }> {
  await wait(1100);
  return MOCK_GOOGLE_USER;
}

export async function saveName(_name: string): Promise<void> {
  await wait(800);
}
