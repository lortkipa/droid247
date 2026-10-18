import { z } from 'zod';

export const HealthStatusSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  time: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
