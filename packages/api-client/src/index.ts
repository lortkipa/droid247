import { RPC_PATH, type Contract } from '@droid247/shared';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';

export type ApiClient = ContractRouterClient<Contract>;

export type ApiClientOptions = {
  /** Extra headers for every call, e.g. the session cookie or a bearer token. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Fetch credentials mode; 'include' sends the session cookie on the web. */
  credentials?: RequestCredentials;
};

/** Creates a typed client for the Droid247 API at `baseUrl` (e.g. http://localhost:3000). */
export function createApiClient(baseUrl: string, options: ApiClientOptions = {}): ApiClient {
  const { headers, credentials } = options;
  const link = new RPCLink({
    url: `${baseUrl.replace(/\/+$/, '')}${RPC_PATH}`,
    headers: headers ? () => headers() : undefined,
    fetch: (request, init) => fetch(request, credentials ? { ...init, credentials } : init),
  });
  return createORPCClient(link);
}
