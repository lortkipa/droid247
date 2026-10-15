import { z } from "zod";

export const HEALTH_PATH = "/health";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
  apiVersion: z.string(),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
