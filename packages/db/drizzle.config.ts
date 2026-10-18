import { defineConfig } from 'drizzle-kit';

import { DEV_DATABASE_URL } from './src/config';

// drizzle-kit runs from packages/db; the repo's .env sits two levels up.
try {
  process.loadEnvFile('../../.env');
} catch {
  // No .env file: use the environment as it is.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL || DEV_DATABASE_URL },
});
