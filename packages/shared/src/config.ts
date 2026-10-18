/** Port the API server listens on when PORT is not set. */
export const API_DEFAULT_PORT = 3000;

/** Path the oRPC handler is mounted at on the server. */
export const RPC_PATH = '/rpc';

/** The one place the Claude model ID is configured. */
export const AGENT_MODEL = 'claude-opus-5-5';

/** URL scheme of the apps (deep links such as droid247://auth). Matches `scheme` in apps/client/app.json. */
export const APP_SCHEME = 'droid247';

/** Server routes for desktop Google sign-in, done in the system browser. */
export const DESKTOP_AUTH_START_PATH = '/auth/desktop/start';
export const DESKTOP_AUTH_COMPLETE_PATH = '/auth/desktop/complete';
