import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export { schema };
export * from './config';
export * from './schema';

/** Connects to Postgres at `url`. Server and worker only; clients never touch the database. */
export function createDb(url: string) {
  return drizzle(postgres(url), { schema });
}

export type Db = ReturnType<typeof createDb>;
