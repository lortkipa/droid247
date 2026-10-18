import { createApiClient } from '@droid247/api-client';

import { authCredentials, authHeaders } from './auth-client';
import { apiUrl } from './server-url';

export { apiUrl };

/** Typed API client; calls carry the session the same way Better Auth's client does. */
export const api = createApiClient(apiUrl, { headers: authHeaders, credentials: authCredentials });
