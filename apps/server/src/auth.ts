import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import {
  type ApiErrorBody,
  AUTH_PATHS,
  CODE_LENGTH,
  CODE_TTL_MS,
  Email,
  type ErrorCode,
  GOOGLE_RETURN_PARAMS,
  GoogleFinishBody,
  type GoogleReturnError,
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
import type { GoogleOAuth } from "./google.ts";
import type { Mailer } from "./mailer.ts";

export interface AuthDeps {
  store: Store;
  mailer: Mailer;
  /** Unset when Google sign-in isn't configured. */
  google?: GoogleOAuth;
  /**
   * Origins a Google sign-in may return to (the UI's origins). Loopback
   * `http://127.0.0.1:<port>` addresses, used by the desktop app, are always allowed.
   */
  returnOrigins?: string[];
  /** Clock in epoch ms, swappable for tests. */
  now?: () => number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
/** How long the app has to claim a finished Google sign-in. */
const GOOGLE_TICKET_TTL_MS = 2 * 60_000;
const MAX_NONCE_LENGTH = 200;

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

/** The `return_to` to send the browser back to, or null if it isn't one of ours. */
function allowedReturnTo(value: string | undefined, origins: string[]): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const loopback = url.protocol === "http:" && url.hostname === "127.0.0.1" && url.port !== "";
  if (!loopback && !origins.includes(url.origin)) return null;
  return `${url.origin}${url.pathname}`;
}

function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}

/** Google serves profile photos at any size; ask for one that stays sharp on hi-dpi screens. */
function largerPhoto(picture: string | null): string | null {
  return picture?.replace(/=s\d+-c$/, "=s256-c") ?? null;
}

function bearerToken(c: Context): string | null {
  const header = c.req.header("authorization");
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function authRoutes({
  store,
  mailer,
  google,
  returnOrigins = [],
  now = Date.now,
}: AuthDeps) {
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
    const googleSub = ticket.google?.googleSub ?? null;
    let user = (googleSub && store.userByGoogleSub(googleSub)) || store.userByEmail(ticket.email);
    if (!user) {
      // Whichever method creates the account sets its avatar: Google's photo, or none.
      const avatarUrl = ticket.google?.avatarUrl ?? null;
      user = { id: randomUUID(), email: ticket.email, name: body.name, avatarUrl };
      store.insertUser(user, now(), googleSub);
    } else if (googleSub) {
      store.linkGoogle(user.id, googleSub);
    }
    return c.json(startSession(user) satisfies Session);
  });

  app.get(AUTH_PATHS.googleStart, (c) => {
    const returnTo = allowedReturnTo(c.req.query("return_to"), returnOrigins);
    const nonce = c.req.query("nonce");
    if (!returnTo || !nonce || nonce.length > MAX_NONCE_LENGTH) {
      return c.text("Invalid Google sign-in request.", 400);
    }
    if (!google) {
      return c.redirect(withParams(returnTo, { [GOOGLE_RETURN_PARAMS.error]: "unavailable" }));
    }

    store.pruneExpired(now());
    const state = newToken();
    const codeVerifier = newToken();
    const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
    store.putGoogleState(
      sha256(state),
      { codeVerifier, returnTo, nonceHash: sha256(nonce) },
      now() + CODE_TTL_MS,
    );
    return c.redirect(google.authUrl(state, challenge));
  });

  app.get(AUTH_PATHS.googleCallback, async (c) => {
    const state = c.req.query("state");
    const pending = state ? store.takeGoogleState(sha256(state)) : undefined;
    if (!pending || pending.expiresAt <= now()) {
      return c.text("This sign-in has expired. Go back to droid247 and try again.", 400);
    }
    const back = (params: Record<string, string>) =>
      c.redirect(withParams(pending.returnTo, params));
    const backWithError = (error: GoogleReturnError) =>
      back({ [GOOGLE_RETURN_PARAMS.error]: error });

    const code = c.req.query("code");
    if (!code)
      return backWithError(c.req.query("error") === "access_denied" ? "cancelled" : "failed");
    if (!google) return backWithError("unavailable");

    let identity: Awaited<ReturnType<GoogleOAuth["exchange"]>>;
    try {
      identity = await google.exchange(code, pending.codeVerifier);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      return backWithError("failed");
    }
    // Accounts are matched by email, so only an address Google vouches for can sign in.
    const email = Email.safeParse(identity.email);
    if (!identity.emailVerified || !email.success) return backWithError("unverified");

    const ticket = newToken();
    store.putGoogleTicket(
      sha256(ticket),
      pending.nonceHash,
      {
        sub: identity.sub,
        email: email.data,
        name: identity.name?.trim().slice(0, 60) ?? "",
        picture: largerPhoto(identity.picture),
      },
      now() + GOOGLE_TICKET_TTL_MS,
    );
    return back({ [GOOGLE_RETURN_PARAMS.ticket]: ticket });
  });

  app.post(AUTH_PATHS.googleFinish, async (c) => {
    const body = await parseBody(c, GoogleFinishBody);
    if (!body) return fail(c, 400, "invalid_request", "Invalid Google sign-in.");

    // The nonce ties the ticket to the app that started the sign-in, so a ticket
    // link sent to someone else can't sign them in to the sender's account.
    const ticket = store.takeGoogleTicket(sha256(body.ticket));
    if (!ticket || ticket.expiresAt <= now() || ticket.nonceHash !== sha256(body.nonce)) {
      return fail(c, 400, "google_failed", "Google sign-in didn't go through. Try again.");
    }
    const { profile } = ticket;

    let user = store.userByGoogleSub(profile.sub);
    if (!user) {
      // An account made with an email code: link it, but keep its name and avatar.
      user = store.userByEmail(profile.email);
      if (user) store.linkGoogle(user.id, profile.sub);
    }
    if (user) {
      return c.json({
        status: "signed-in",
        session: startSession(user),
      } satisfies VerifyCodeResponse);
    }

    const signupToken = newToken();
    store.putTicket(sha256(signupToken), profile.email, now() + CODE_TTL_MS, {
      googleSub: profile.sub,
      avatarUrl: profile.picture,
    });
    return c.json({
      status: "new-account",
      signupToken,
      name: profile.name || undefined,
      avatarUrl: profile.picture ?? undefined,
    } satisfies VerifyCodeResponse);
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
