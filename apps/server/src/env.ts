import { DEV_DATABASE_URL } from '@droid247/db';
import { API_DEFAULT_PORT } from '@droid247/shared';
import { z } from 'zod';

// The repo's .env (copied from .env.example); a real environment variable wins.
for (const path of ['.env', '../../.env']) {
  try {
    process.loadEnvFile(path);
    break;
  } catch {
    // No file at this path.
  }
}

const isProduction = process.env.NODE_ENV === 'production';

/** In development a variable may fall back to a default; in production it must be set. */
function devDefault(value: string) {
  return isProduction ? z.string().min(1) : z.string().min(1).default(value);
}

const optional = z.string().optional();

const EnvSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(API_DEFAULT_PORT),
    HOST: z.string().min(1).default('0.0.0.0'),
    // Comma-separated origins of the web app and desktop app, allowed to call the API
    // with credentials and trusted as sign-in redirect targets.
    CORS_ORIGIN: z.string().min(1).default('http://localhost:8081,tauri://localhost,http://tauri.localhost'),
    DATABASE_URL: devDefault(DEV_DATABASE_URL),
    BETTER_AUTH_SECRET: devDefault('dev-only-secret-change-me-in-production-0123456789'),
    // Public URL of this server; Google redirects back to <BETTER_AUTH_URL>/api/auth/callback/google.
    BETTER_AUTH_URL: optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    // SMTP server for sign-in codes. Without it (dev only) codes are printed to the server log.
    SMTP_HOST: isProduction ? z.string().min(1) : optional,
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_USER: isProduction ? z.string().min(1) : optional,
    SMTP_PASS: isProduction ? z.string().min(1) : optional,
    // Sender shown in the inbox, e.g. `Droid247 <you@gmail.com>`. Default: SMTP_USER.
    EMAIL_FROM: optional,
  })
  .transform(({ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, ...env }) => ({
    ...env,
    smtp:
      SMTP_HOST && SMTP_USER && SMTP_PASS
        ? { host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass: SMTP_PASS, from: EMAIL_FROM ?? SMTP_USER }
        : undefined,
    BETTER_AUTH_URL: (env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`).replace(/\/+$/, ''),
    corsOrigins: env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    isProduction,
  }));

// Empty values (e.g. `DATABASE_URL=` copied from .env.example) mean "use the default".
export const env = EnvSchema.parse(
  Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')),
);
