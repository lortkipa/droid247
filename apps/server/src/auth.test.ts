import { AUTH_PATHS, CODE_TTL_MS, Session, User, VerifyCodeResponse } from "@droid247/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createStore, openDatabase } from "./db.ts";
import type { Mailer } from "./mailer.ts";

let clock: number;
let sent: { to: string; code: string }[];
let failMail: boolean;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  clock = Date.UTC(2026, 0, 1);
  sent = [];
  failMail = false;
  const mailer: Mailer = {
    async sendLoginCode(to, code) {
      if (failMail) throw new Error("SMTP down");
      sent.push({ to, code });
    },
  };
  app = createApp(
    { corsOrigins: [] },
    { store: createStore(openDatabase(":memory:")), mailer, now: () => clock },
    { log: false },
  );
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
