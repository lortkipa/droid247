import { createHash } from "node:crypto";
import { AUTH_PATHS, CODE_TTL_MS, Session, User, VerifyCodeResponse } from "@droid247/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createStore, openDatabase } from "./db.ts";
import type { GoogleIdentity, GoogleOAuth } from "./google.ts";
import type { Mailer } from "./mailer.ts";

const UI = "http://localhost:5173";
const PHOTO = "https://lh3.googleusercontent.com/a/photo=s96-c";

let clock: number;
let sent: { to: string; code: string }[];
let failMail: boolean;
let identity: GoogleIdentity;
let challenges: Map<string, string>;
let app: ReturnType<typeof createApp>;

/** Stands in for Google: any state is accepted, "good-code" is the only valid code. */
const fakeGoogle: GoogleOAuth = {
  authUrl(state, challenge) {
    challenges.set(state, challenge);
    return `https://google.test/auth?state=${state}`;
  },
  async exchange(code, verifier) {
    if (code !== "good-code") throw new Error("bad code");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    if (![...challenges.values()].includes(challenge)) throw new Error("PKCE mismatch");
    return identity;
  },
};

function makeApp(google: GoogleOAuth | null = fakeGoogle) {
  const mailer: Mailer = {
    async sendLoginCode(to, code) {
      if (failMail) throw new Error("SMTP down");
      sent.push({ to, code });
    },
  };
  return createApp(
    { corsOrigins: [UI] },
    {
      store: createStore(openDatabase(":memory:")),
      mailer,
      google: google ?? undefined,
      now: () => clock,
    },
    { log: false },
  );
}

beforeEach(() => {
  clock = Date.UTC(2026, 0, 1);
  sent = [];
  failMail = false;
  challenges = new Map();
  identity = {
    sub: "google-1",
    email: "ada@example.com",
    emailVerified: true,
    name: "Ada Google",
    picture: PHOTO,
  };
  app = makeApp();
});

function post(path: string, body: unknown, token?: string) {
  return app.request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const authed = (token: string, method = "GET") =>
  app.request(AUTH_PATHS.me, { method, headers: { authorization: `Bearer ${token}` } });

async function requestCode(email: string): Promise<string> {
  const res = await post(AUTH_PATHS.requestCode, { email });
  expect(res.status).toBe(204);
  const last = sent.at(-1);
  if (!last) throw new Error("no code sent");
  return last.code;
}

async function verify(email: string, code: string) {
  const res = await post(AUTH_PATHS.verifyCode, { email, code });
  return { status: res.status, body: (await res.json()) as unknown };
}

async function signUp(email: string, name: string): Promise<Session> {
  const code = await requestCode(email);
  const { body } = await verify(email, code);
  const result = VerifyCodeResponse.parse(body);
  if (result.status !== "new-account") throw new Error("expected new account");
  const res = await post(AUTH_PATHS.signup, { signupToken: result.signupToken, name });
  expect(res.status).toBe(200);
  return Session.parse(await res.json());
}

const wrong = (code: string) => (code === "000000" ? "111111" : "000000");

describe("email code sign-in", () => {
  it("emails a 6-digit code", async () => {
    const code = await requestCode("a@b.co");
    expect(code).toMatch(/^\d{6}$/);
    expect(sent[0]?.to).toBe("a@b.co");
  });

  it("rejects an invalid email", async () => {
    const res = await post(AUTH_PATHS.requestCode, { email: "nope" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_request" });
  });

  it("creates an account on first sign-in, asking for the name once", async () => {
    const session = await signUp("new@example.com", "  Ada Lovelace ");
    expect(session.user).toMatchObject({ email: "new@example.com", name: "Ada Lovelace" });

    const me = await authed(session.token);
    expect(User.parse(await me.json())).toEqual(session.user);
  });

  it("signs a returning user straight in", async () => {
    const first = await signUp("back@example.com", "Ada");
    const { status, body } = await verify(
      "back@example.com",
      await requestCode("back@example.com"),
    );
    expect(status).toBe(200);
    const result = VerifyCodeResponse.parse(body);
    expect(result.status).toBe("signed-in");
    if (result.status === "signed-in") expect(result.session.user).toEqual(first.user);
  });

  it("treats email case-insensitively", async () => {
    await signUp("Case@Example.com", "Ada");
    const code = await requestCode("CASE@example.COM");
    const result = VerifyCodeResponse.parse((await verify("case@example.com", code)).body);
    expect(result.status).toBe("signed-in");
  });

  it("burns the code after one wrong attempt", async () => {
    const code = await requestCode("a@b.co");
    const bad = await verify("a@b.co", wrong(code));
    expect(bad).toMatchObject({ status: 400, body: { error: "invalid_code" } });

    const retry = await verify("a@b.co", code);
    expect(retry).toMatchObject({ status: 400, body: { error: "code_expired" } });
  });

  it("burns the code after use", async () => {
    const code = await requestCode("a@b.co");
    expect((await verify("a@b.co", code)).status).toBe(200);
    expect(await verify("a@b.co", code)).toMatchObject({ body: { error: "code_expired" } });
  });

  it("expires codes after 10 minutes", async () => {
    const code = await requestCode("a@b.co");
    clock += CODE_TTL_MS;
    expect(await verify("a@b.co", code)).toMatchObject({
      status: 400,
      body: { error: "code_expired" },
    });
  });

  it("accepts a code just before it expires", async () => {
    const code = await requestCode("a@b.co");
    clock += CODE_TTL_MS - 1;
    expect((await verify("a@b.co", code)).status).toBe(200);
  });

  it("replaces the previous code when a new one is requested", async () => {
    const first = await requestCode("a@b.co");
    let second = await requestCode("a@b.co");
    while (second === first) second = await requestCode("a@b.co");
    expect(await verify("a@b.co", first)).toMatchObject({ body: { error: "invalid_code" } });
  });

  it("reports mail failures and keeps no code around", async () => {
    failMail = true;
    const res = await post(AUTH_PATHS.requestCode, { email: "a@b.co" });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "email_failed" });
  });

  it("only accepts a signup ticket once", async () => {
    const code = await requestCode("a@b.co");
    const result = VerifyCodeResponse.parse((await verify("a@b.co", code)).body);
    if (result.status !== "new-account") throw new Error("expected new account");

    expect(
      (await post(AUTH_PATHS.signup, { signupToken: result.signupToken, name: "A" })).status,
    ).toBe(200);
    const again = await post(AUTH_PATHS.signup, { signupToken: result.signupToken, name: "B" });
    expect(again.status).toBe(400);
    expect(await again.json()).toMatchObject({ error: "signup_expired" });
  });

  it("expires signup tickets", async () => {
    const code = await requestCode("a@b.co");
    const result = VerifyCodeResponse.parse((await verify("a@b.co", code)).body);
    if (result.status !== "new-account") throw new Error("expected new account");
    clock += CODE_TTL_MS;
    const res = await post(AUTH_PATHS.signup, { signupToken: result.signupToken, name: "A" });
    expect(await res.json()).toMatchObject({ error: "signup_expired" });
  });

  it("rejects an empty name", async () => {
    const res = await post(AUTH_PATHS.signup, { signupToken: "x", name: "   " });
    expect(await res.json()).toMatchObject({ error: "invalid_request" });
  });
});

describe("sessions", () => {
  it("requires a valid bearer token", async () => {
    expect((await app.request(AUTH_PATHS.me)).status).toBe(401);
    expect((await authed("garbage")).status).toBe(401);
  });

  it("logs out only the current session", async () => {
    const a = await signUp("a@b.co", "Ada");
    const code = await requestCode("a@b.co");
    const second = VerifyCodeResponse.parse((await verify("a@b.co", code)).body);
    if (second.status !== "signed-in") throw new Error("expected sign-in");

    expect((await post(AUTH_PATHS.logout, {}, a.token)).status).toBe(204);
    expect((await authed(a.token)).status).toBe(401);
    expect((await authed(second.session.token)).status).toBe(200);
  });

  it("expires sessions after 30 days", async () => {
    const { token } = await signUp("a@b.co", "Ada");
    clock += 30 * 24 * 60 * 60_000;
    expect((await authed(token)).status).toBe(401);
  });

  it("deletes the account and all its sessions", async () => {
    const { token } = await signUp("a@b.co", "Ada");
    expect((await authed(token, "DELETE")).status).toBe(204);
    expect((await authed(token)).status).toBe(401);

    // The email is free again, so the name is asked again.
    const code = await requestCode("a@b.co");
    const result = VerifyCodeResponse.parse((await verify("a@b.co", code)).body);
    expect(result.status).toBe("new-account");
  });
});

function location(res: Response): URL {
  expect(res.status).toBe(302);
  const value = res.headers.get("location");
  if (!value) throw new Error("no redirect");
  return new URL(value);
}

const startGoogle = (returnTo: string, nonce: string) =>
  app.request(`${AUTH_PATHS.googleStart}?${new URLSearchParams({ return_to: returnTo, nonce })}`);

/** Runs the browser half of a Google sign-in and returns where the browser lands. */
async function googleRedirect(
  { nonce = "nonce-1", returnTo = UI, code = "good-code" } = {},
  callbackParams?: Record<string, string>,
): Promise<URL> {
  const state = location(await startGoogle(returnTo, nonce)).searchParams.get("state") ?? "";
  const params = new URLSearchParams(callbackParams ?? { state, code });
  if (callbackParams) params.set("state", state);
  return location(await app.request(`${AUTH_PATHS.googleCallback}?${params}`));
}

async function googleTicket(nonce = "nonce-1"): Promise<string> {
  const ticket = (await googleRedirect({ nonce })).searchParams.get("google_ticket");
  if (!ticket) throw new Error("no ticket");
  return ticket;
}

async function googleFinish(ticket: string, nonce = "nonce-1") {
  const res = await post(AUTH_PATHS.googleFinish, { ticket, nonce });
  return { status: res.status, body: (await res.json()) as unknown };
}

async function googleSignUp(name: string): Promise<Session> {
  const result = VerifyCodeResponse.parse((await googleFinish(await googleTicket())).body);
  if (result.status !== "new-account") throw new Error("expected new account");
  const res = await post(AUTH_PATHS.signup, { signupToken: result.signupToken, name });
  expect(res.status).toBe(200);
  return Session.parse(await res.json());
}

describe("Google sign-in", () => {
  it("suggests the Google name for a new account and keeps the photo", async () => {
    const result = VerifyCodeResponse.parse((await googleFinish(await googleTicket())).body);
    expect(result).toMatchObject({
      status: "new-account",
      name: "Ada Google",
      avatarUrl: "https://lh3.googleusercontent.com/a/photo=s256-c",
    });
    if (result.status !== "new-account") return;

    // The suggested name can be changed.
    const res = await post(AUTH_PATHS.signup, { signupToken: result.signupToken, name: "Ada" });
    const session = Session.parse(await res.json());
    expect(session.user).toMatchObject({
      email: "ada@example.com",
      name: "Ada",
      avatarUrl: "https://lh3.googleusercontent.com/a/photo=s256-c",
    });
  });

  it("signs a returning Google user straight in", async () => {
    const first = await googleSignUp("Ada");
    const again = VerifyCodeResponse.parse((await googleFinish(await googleTicket())).body);
    expect(again.status).toBe("signed-in");
    if (again.status === "signed-in") expect(again.session.user).toEqual(first.user);
  });

  it("finds the account by Google id even if the Google email changed", async () => {
    const first = await googleSignUp("Ada");
    identity = { ...identity, email: "ada@new.example" };
    const again = VerifyCodeResponse.parse((await googleFinish(await googleTicket())).body);
    if (again.status !== "signed-in") throw new Error("expected sign-in");
    expect(again.session.user.id).toBe(first.user.id);
  });

  it("keeps the name and default avatar of an account made with an email code", async () => {
    const emailUser = await signUp("ada@example.com", "Ada Email");
    identity = { ...identity, email: "Ada@Example.com" };
    const result = VerifyCodeResponse.parse((await googleFinish(await googleTicket())).body);
    if (result.status !== "signed-in") throw new Error("expected sign-in");
    expect(result.session.user).toEqual({ ...emailUser.user, avatarUrl: null });
    expect(result.session.user.name).toBe("Ada Email");

    // Linked: the second Google sign-in matches by Google id and still changes nothing.
    const again = VerifyCodeResponse.parse((await googleFinish(await googleTicket())).body);
    if (again.status !== "signed-in") throw new Error("expected sign-in");
    expect(again.session.user).toEqual(emailUser.user);
  });

  it("keeps the Google name and photo when signing in with an email code", async () => {
    const googleUser = await googleSignUp("Ada G");
    const code = await requestCode("ada@example.com");
    const result = VerifyCodeResponse.parse((await verify("ada@example.com", code)).body);
    if (result.status !== "signed-in") throw new Error("expected sign-in");
    expect(result.session.user).toEqual(googleUser.user);
    expect(result.session.user.avatarUrl).toMatch(/googleusercontent/);
  });

  it("only lets the app that started the sign-in claim the ticket", async () => {
    const ticket = await googleTicket("mine");
    expect(await googleFinish(ticket, "someone-else")).toMatchObject({
      status: 400,
      body: { error: "google_failed" },
    });
    // The failed attempt used the ticket up.
    expect((await googleFinish(ticket, "mine")).status).toBe(400);
  });

  it("accepts a ticket once", async () => {
    const ticket = await googleTicket();
    expect((await googleFinish(ticket)).status).toBe(200);
    expect(await googleFinish(ticket)).toMatchObject({ body: { error: "google_failed" } });
  });

  it("expires tickets after 2 minutes", async () => {
    const ticket = await googleTicket();
    clock += 2 * 60_000;
    expect(await googleFinish(ticket)).toMatchObject({ body: { error: "google_failed" } });
  });

  it("only returns to the UI or a loopback address", async () => {
    expect((await startGoogle("https://evil.example/", "n")).status).toBe(400);
    expect((await startGoogle("http://localhost:5173.evil.example/", "n")).status).toBe(400);
    expect((await startGoogle("not a url", "n")).status).toBe(400);

    const loopback = await googleRedirect({ returnTo: "http://127.0.0.1:4567/" });
    expect(loopback.origin).toBe("http://127.0.0.1:4567");
    expect(loopback.searchParams.get("google_ticket")).toBeTruthy();
  });

  it("refuses an unverified Google email", async () => {
    identity = { ...identity, emailVerified: false };
    const landed = await googleRedirect();
    expect(landed.searchParams.get("google_error")).toBe("unverified");
    expect(landed.searchParams.get("google_ticket")).toBeNull();
  });

  it("reports a cancelled sign-in", async () => {
    const landed = await googleRedirect({}, { error: "access_denied" });
    expect(`${landed.origin}${landed.pathname}`).toBe(`${UI}/`);
    expect(landed.searchParams.get("google_error")).toBe("cancelled");
  });

  it("reports a failed code exchange", async () => {
    const landed = await googleRedirect({ code: "bad-code" });
    expect(landed.searchParams.get("google_error")).toBe("failed");
  });

  it("rejects an unknown or reused state", async () => {
    const state = location(await startGoogle(UI, "n")).searchParams.get("state") ?? "";
    const callback = `${AUTH_PATHS.googleCallback}?${new URLSearchParams({ state, code: "good-code" })}`;
    expect((await app.request(callback)).status).toBe(302);
    expect((await app.request(callback)).status).toBe(400);
  });

  it("reports when Google isn't configured", async () => {
    app = makeApp(null);
    const landed = location(await startGoogle(UI, "n"));
    expect(landed.searchParams.get("google_error")).toBe("unavailable");
  });
});
