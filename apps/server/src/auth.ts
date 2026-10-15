import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import {
  type ApiErrorBody,
  AUTH_PATHS,
  CODE_LENGTH,
  CODE_TTL_MS,
  type ErrorCode,
  RequestCodeBody,
  type Session,
  SignupBody,
  type User,
  VerifyCodeBody,
  type VerifyCodeResponse,
} from "@droid247/shared";
import { type Context, Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Store } from "./db.ts";
import type { Mailer } from "./mailer.ts";

export interface AuthDeps {
  store: Store;
  mailer: Mailer;
  /** Clock in epoch ms, swappable for tests. */
  now?: () => number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

function fail(c: Context, status: ContentfulStatusCode, error: ErrorCode, message: string) {
  return c.json({ error, message } satisfies ApiErrorBody, status);
}

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

async function parseBody<T>(c: Context, schema: Schema<T>): Promise<T | null> {
  const json = await c.req.json().catch(() => undefined);
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function bearerToken(c: Context): string | null {
  const header = c.req.header("authorization");
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function authRoutes({ store, mailer, now = Date.now }: AuthDeps) {
  const app = new Hono();

  function startSession(user: User): Session {
    const token = newToken();
    store.putSession(sha256(token), user.id, now() + SESSION_TTL_MS);
    return { token, user };
  }

  const requireSession = createMiddleware<{ Variables: { user: User; tokenHash: string } }>(
    async (c, next) => {
      const token = bearerToken(c);
      const tokenHash = token ? sha256(token) : null;
      const user = tokenHash ? store.sessionUser(tokenHash, now()) : undefined;
      if (!tokenHash || !user) return fail(c, 401, "unauthorized", "Not signed in");
      c.set("user", user);
      c.set("tokenHash", tokenHash);
      await next();
    },
  );

  app.post(AUTH_PATHS.requestCode, async (c) => {
    const body = await parseBody(c, RequestCodeBody);
    if (!body) return fail(c, 400, "invalid_request", "Enter a valid email address.");

    store.pruneExpired(now());
    const code = randomInt(0, 10 ** CODE_LENGTH)
      .toString()
      .padStart(CODE_LENGTH, "0");
    store.putCode(body.email, sha256(code), now() + CODE_TTL_MS);

    try {
      await mailer.sendLoginCode(body.email, code);
    } catch (err) {
      console.error("Failed to send sign-in code:", err);
      store.deleteCode(body.email);
      return fail(c, 502, "email_failed", "We couldn't send the email. Try again in a moment.");
    }
    return c.body(null, 204);
  });

  app.post(AUTH_PATHS.verifyCode, async (c) => {
    const body = await parseBody(c, VerifyCodeBody);
    if (!body) return fail(c, 400, "invalid_request", "Enter the 6-digit code.");

    // Taking the code deletes it, so a wrong guess can't be followed by another.
    const stored = store.takeCode(body.email);
    if (!stored || stored.expiresAt <= now()) {
      return fail(c, 400, "code_expired", "This code has expired. Go back to get a new one.");
    }
    const matches = timingSafeEqual(
      Buffer.from(sha256(body.code), "hex"),
      Buffer.from(stored.codeHash, "hex"),
    );
    if (!matches) {
      return fail(c, 400, "invalid_code", "That code is incorrect. Go back to get a new one.");
    }

    const user = store.userByEmail(body.email);
    if (user) {
      return c.json({
        status: "signed-in",
        session: startSession(user),
      } satisfies VerifyCodeResponse);
    }

    const signupToken = newToken();
    store.putTicket(sha256(signupToken), body.email, now() + CODE_TTL_MS);
    return c.json({ status: "new-account", signupToken } satisfies VerifyCodeResponse);
  });

  app.post(AUTH_PATHS.signup, async (c) => {
    const body = await parseBody(c, SignupBody);
    if (!body) return fail(c, 400, "invalid_request", "Enter your name.");

    const ticket = store.takeTicket(sha256(body.signupToken));
    if (!ticket || ticket.expiresAt <= now()) {
      return fail(c, 400, "signup_expired", "This sign-up has expired. Start again.");
    }

    // Two tabs could finish sign-up for the same email; the second just signs in.
    let user = store.userByEmail(ticket.email);
    if (!user) {
      user = { id: randomUUID(), email: ticket.email, name: body.name };
      store.insertUser(user, now());
    }
    return c.json(startSession(user) satisfies Session);
  });

  app.get(AUTH_PATHS.me, requireSession, (c) => c.json(c.get("user") satisfies User));

  app.post(AUTH_PATHS.logout, requireSession, (c) => {
    store.deleteSession(c.get("tokenHash"));
    return c.body(null, 204);
  });

  app.delete(AUTH_PATHS.me, requireSession, (c) => {
    // Sessions go with the user (ON DELETE CASCADE).
    store.deleteUser(c.get("user").id);
    return c.body(null, 204);
  });

  return app;
}
