import { contract, type HealthStatus } from '@droid247/shared';
import { implement } from '@orpc/server';

import pkg from '../package.json' with { type: 'json' };

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

const os = implement(contract);

export const router = os.router({
  health: os.health.handler(() => getHealth()),
});
