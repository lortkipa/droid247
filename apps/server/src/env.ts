import { API_DEFAULT_PORT } from '@droid247/shared';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(API_DEFAULT_PORT),
  HOST: z.string().min(1).default('0.0.0.0'),
  // Comma-separated allowed origins, or "*" for any (dev only).
  CORS_ORIGIN: z.string().min(1).default('*'),
});

export const env = EnvSchema.parse(process.env);
