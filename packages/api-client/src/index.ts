import { RPC_PATH, type Contract } from '@droid247/shared';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';

export type ApiClient = ContractRouterClient<Contract>;

/** Creates a typed client for the Droid247 API at `baseUrl` (e.g. http://localhost:3000). */
export function createApiClient(baseUrl: string): ApiClient {
  const link = new RPCLink({ url: `${baseUrl.replace(/\/+$/, '')}${RPC_PATH}` });
  return createORPCClient(link);
}
