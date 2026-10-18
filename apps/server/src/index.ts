import { RPC_PATH } from '@droid247/shared';
import { serve } from '@hono/node-server';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { auth } from './auth';
import { mountDesktopAuth } from './desktop-auth';
import { env } from './env';
import { getHealth, router } from './router';

const rpcHandler = new RPCHandler(router);

const app = new Hono();

app.use(logger());
app.use(
  '*',
  cors({
    origin: env.corsOrigins,
    // Web sends the session cookie, desktop a bearer token.
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Plain JSON endpoint for curl, Docker health checks and uptime monitors.
app.get('/health', (c) => c.json(getHealth()));

// Better Auth: sign-in, sessions, sign-out (see auth.ts).
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

mountDesktopAuth(app);

app.use(`${RPC_PATH}/*`, async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: RPC_PATH,
    context: { headers: c.req.raw.headers },
  });
  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  console.log(`Droid247 server listening on http://${info.address}:${info.port}`);
});
