import { createDb } from '@droid247/db';

import { env } from './env';

export const db = createDb(env.DATABASE_URL);
