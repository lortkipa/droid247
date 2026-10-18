import { oc } from '@orpc/contract';

import { CompleteProfileInputSchema } from './auth';
import { HealthStatusSchema } from './health';

/**
 * The API contract shared by the server (which implements it) and every
 * client (which calls it through @droid247/api-client).
 */
export const contract = {
  health: oc.route({ method: 'GET', path: '/health' }).output(HealthStatusSchema),
  /** Procedures for the signed-in user. Sign-in itself goes through Better Auth at /api/auth. */
  account: {
    /** Sets the name once, right after the account is created. Fails if it was set before. */
    completeProfile: oc.input(CompleteProfileInputSchema),
    /** Deletes the account with all its sessions and linked sign-in methods. */
    delete: oc,
  },
};

export type Contract = typeof contract;
