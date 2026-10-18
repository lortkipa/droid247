import { oc } from '@orpc/contract';

import { HealthStatusSchema } from './health';

/**
 * The API contract shared by the server (which implements it) and every
 * client (which calls it through @droid247/api-client).
 */
export const contract = {
  health: oc.route({ method: 'GET', path: '/health' }).output(HealthStatusSchema),
};

export type Contract = typeof contract;
