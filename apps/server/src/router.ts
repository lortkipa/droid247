import { user } from '@droid247/db';
import { contract, type HealthStatus } from '@droid247/shared';
import { implement, ORPCError } from '@orpc/server';
import { and, eq } from 'drizzle-orm';

import pkg from '../package.json' with { type: 'json' };
import { auth } from './auth';
import { db } from './db';

const startedAt = Date.now();

export function getHealth(): HealthStatus {
  return {
    status: 'ok',
    service: 'droid247-server',
    version: pkg.version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    time: new Date().toISOString(),
  };
}

/** Request headers carry the session (cookie or bearer token). */
export type RpcContext = { headers: Headers };

const os = implement(contract).$context<RpcContext>();

/** Lets a procedure run only with a valid session and gives it the user. */
const authed = os.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) {
    throw new ORPCError('UNAUTHORIZED');
  }
  return next({ context: { user: session.user } });
});

export const router = os.router({
  health: os.health.handler(() => getHealth()),
  account: {
    completeProfile: os.account.completeProfile.use(authed).handler(async ({ input, context }) => {
      // Profile data is set only once, when the account is created.
      const updated = await db
        .update(user)
        .set({ name: input.name, onboarded: true })
        .where(and(eq(user.id, context.user.id), eq(user.onboarded, false)))
        .returning({ id: user.id });
      if (updated.length === 0) {
        throw new ORPCError('CONFLICT', { message: 'The profile is already set up.' });
      }
    }),
    delete: os.account.delete.use(authed).handler(async ({ context }) => {
      // Sessions and linked accounts go with the user (ON DELETE CASCADE).
      await db.delete(user).where(eq(user.id, context.user.id));
    }),
  },
});
