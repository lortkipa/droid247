import { API_VERSION, HEALTH_PATH, type HealthResponse } from "@droid247/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import pkg from "../package.json" with { type: "json" };
import type { ServerConfig } from "./config.ts";

export function createApp(config: Pick<ServerConfig, "corsOrigins">, { log = true } = {}) {
  const app = new Hono();

  if (log) app.use(logger());
  app.use(cors({ origin: config.corsOrigins }));

  app.get(HEALTH_PATH, (c) =>
    c.json({
      status: "ok",
      service: "droid247-server",
      version: pkg.version,
      apiVersion: API_VERSION,
      time: new Date().toISOString(),
    } satisfies HealthResponse),
  );

  return app;
}
