import { z } from "zod";

export const AUTH_PATHS = {
  /** POST: email a one-time sign-in code. */
  requestCode: "/auth/code",
  /** POST: check a code. Signs in, or hands out a signup ticket for a new email. */
  verifyCode: "/auth/verify",
  /** POST: create the account (this is the only time the name is asked). */
  signup: "/auth/signup",
  /** GET: the signed-in user. DELETE: delete the account. */
  me: "/auth/me",
  /** POST: end the current session. */
  logout: "/auth/logout",
} as const;

export const CODE_LENGTH = 6;
/** How long an emailed code (and the signup ticket it turns into) stays valid. */
export const CODE_TTL_MS = 10 * 60_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/** Emails are compared case-insensitively, so they're stored lowercased. */
export const Email = z.string().trim().toLowerCase().regex(EMAIL_PATTERN, "Invalid email address");
export const Name = z.string().trim().min(1).max(60);
export const Code = z.string().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), "Invalid code");

export const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export type User = z.infer<typeof User>;

export const Session = z.object({
  /** Bearer token for the `Authorization` header. */
  token: z.string(),
  user: User,
});
export type Session = z.infer<typeof Session>;

export const RequestCodeBody = z.object({ email: Email });
export type RequestCodeBody = z.infer<typeof RequestCodeBody>;

export const VerifyCodeBody = z.object({ email: Email, code: Code });
export type VerifyCodeBody = z.infer<typeof VerifyCodeBody>;

export const VerifyCodeResponse = z.discriminatedUnion("status", [
  z.object({ status: z.literal("signed-in"), session: Session }),
  /** No account for this email yet: ask for a name, then call signup with the ticket. */
  z.object({ status: z.literal("new-account"), signupToken: z.string() }),
]);
export type VerifyCodeResponse = z.infer<typeof VerifyCodeResponse>;

export const SignupBody = z.object({ signupToken: z.string().min(1), name: Name });
export type SignupBody = z.infer<typeof SignupBody>;

export const ErrorCode = z.enum([
  "invalid_request",
  /** Wrong code. The code is used up, so a new one must be requested. */
  "invalid_code",
  /** No usable code: it expired, was already used, or was never sent. */
  "code_expired",
  "signup_expired",
  "email_failed",
  "unauthorized",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorBody = z.object({ error: ErrorCode, message: z.string() });
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
