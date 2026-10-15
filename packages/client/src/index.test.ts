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
