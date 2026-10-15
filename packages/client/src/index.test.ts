import { API_VERSION } from "@droid247/shared";
import { describe, expect, it } from "vitest";
import { ApiError, createApiClient, type FetchLike } from "./index.ts";

const healthy = {
  status: "ok",
  service: "droid247-server",
  version: "0.1.0",
  apiVersion: API_VERSION,
  time: new Date().toISOString(),
};

function fakeFetch(body: unknown, status = 200): FetchLike {
  return async () => Response.json(body, { status });
}

describe("createApiClient().health", () => {
  it("returns the parsed health response", async () => {
    const client = createApiClient({ baseUrl: "http://x/", fetch: fakeFetch(healthy) });
    const { health } = await client.health();
    expect(health.service).toBe("droid247-server");
  });

  it("rejects an incompatible API major", async () => {
    const client = createApiClient({
      baseUrl: "http://x",
      fetch: fakeFetch({ ...healthy, apiVersion: "99.0" }),
    });
    await expect(client.health()).rejects.toMatchObject({ kind: "incompatible" });
  });

  it("wraps network failures", async () => {
    const client = createApiClient({
      baseUrl: "http://x",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(client.health()).rejects.toBeInstanceOf(ApiError);
    await expect(client.health()).rejects.toMatchObject({ kind: "network" });
  });

  it("reports HTTP errors", async () => {
    const client = createApiClient({ baseUrl: "http://x", fetch: fakeFetch({}, 503) });
    await expect(client.health()).rejects.toMatchObject({ kind: "http" });
  });
});

describe("auth calls", () => {
  it("sends the session token on signed-in calls", async () => {
    let seen: Headers | undefined;
    const client = createApiClient({
      baseUrl: "http://x",
      getToken: () => "tok",
      fetch: async (_url, init) => {
        seen = new Headers(init?.headers);
        return Response.json({ id: "1", email: "a@b.co", name: "Ada", avatarUrl: null });
      },
    });
    await expect(client.me()).resolves.toEqual({
      id: "1",
      email: "a@b.co",
      name: "Ada",
      avatarUrl: null,
    });
    expect(seen?.get("authorization")).toBe("Bearer tok");
  });

  it("does not send the token on sign-in calls", async () => {
    let seen: Headers | undefined;
    const client = createApiClient({
      baseUrl: "http://x",
      getToken: () => "tok",
      fetch: async (_url, init) => {
        seen = new Headers(init?.headers);
        return new Response(null, { status: 204 });
      },
    });
    await client.requestCode("a@b.co");
    expect(seen?.get("authorization")).toBeNull();
  });

  it("exposes the server error code and message", async () => {
    const client = createApiClient({
      baseUrl: "http://x",
      fetch: fakeFetch({ error: "invalid_code", message: "That code is incorrect." }, 400),
    });
    await expect(client.verifyCode("a@b.co", "000000")).rejects.toMatchObject({
      kind: "http",
      status: 400,
      code: "invalid_code",
      message: "That code is incorrect.",
    });
  });
});

describe("Google sign-in", () => {
  it("builds the start URL", () => {
    const client = createApiClient({ baseUrl: "http://x/" });
    const url = new URL(client.googleStartUrl("http://localhost:5173", "n1"));
    expect(url.origin + url.pathname).toBe("http://x/auth/google/start");
    expect(url.searchParams.get("return_to")).toBe("http://localhost:5173");
    expect(url.searchParams.get("nonce")).toBe("n1");
  });

  it("posts the ticket and nonce and parses a new-account answer", async () => {
    let sent: unknown;
    const client = createApiClient({
      baseUrl: "http://x",
      fetch: async (_url, init) => {
        sent = JSON.parse(String(init?.body));
        return Response.json({
          status: "new-account",
          signupToken: "s",
          name: "Ada",
          avatarUrl: "https://lh3.googleusercontent.com/a/x=s256-c",
        });
      },
    });
    await expect(client.googleFinish("t", "n")).resolves.toMatchObject({
      status: "new-account",
      name: "Ada",
    });
    expect(sent).toEqual({ ticket: "t", nonce: "n" });
  });
});
