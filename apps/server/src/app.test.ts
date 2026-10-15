import { API_VERSION, HealthResponse } from "@droid247/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createStore, openDatabase } from "./db.ts";
import { consoleMailer } from "./mailer.ts";

const app = createApp(
  { corsOrigins: ["http://localhost:5173"] },
  { store: createStore(openDatabase(":memory:")), mailer: consoleMailer },
  { log: false },
);

describe("GET /health", () => {
  it("returns a valid health response", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = HealthResponse.parse(await res.json());
    expect(body.apiVersion).toBe(API_VERSION);
  });

  it("allows configured origins", async () => {
    const res = await app.request("/health", { headers: { origin: "http://localhost:5173" } });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("does not allow other origins", async () => {
    const res = await app.request("/health", { headers: { origin: "https://evil.example" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows the Authorization header in preflight", async () => {
    const res = await app.request("/auth/me", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "DELETE",
        "access-control-request-headers": "authorization",
      },
    });
    expect(res.headers.get("access-control-allow-headers")).toMatch(/authorization/i);
    expect(res.headers.get("access-control-allow-methods")).toMatch(/DELETE/);
  });
});
