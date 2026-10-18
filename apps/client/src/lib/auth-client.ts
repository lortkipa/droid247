import { APP_SCHEME, DESKTOP_AUTH_START_PATH } from '@droid247/shared';
import { createAuthClient } from 'better-auth/react';
import { oneTimeTokenClient } from 'better-auth/client/plugins';

import { commonAuthPlugins, googleErrorMessage } from './auth-plugins';
import { apiUrl } from './server-url';

/**
 * Better Auth client for the web build, which also runs inside the desktop app.
 * (Phones use auth-client.native.ts.)
 *
 * - Web: the session is an HTTP-only cookie on the API's origin.
 * - Desktop (Tauri): the window can't share cookies with the API in release
 *   builds, so the session token is kept in localStorage and sent as a bearer
 *   token. Google sign-in runs in the system browser and comes back through a
 *   droid247:// deep link (see apps/server/src/desktop-auth.ts).
 */

const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const TOKEN_KEY = 'droid247.session-token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: the session lasts until the app closes.
  }
}

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [...commonAuthPlugins, oneTimeTokenClient()],
  fetchOptions: isDesktop
    ? {
        credentials: 'omit',
        auth: { type: 'Bearer', token: () => readToken() ?? undefined },
        onSuccess: (context) => {
          // The bearer plugin returns the session token on every sign-in.
          const token = context.response.headers.get('set-auth-token');
          if (token) writeToken(token);
          if (new URL(context.request.url).pathname.endsWith('/sign-out')) writeToken(null);
        },
      }
    : { credentials: 'include' },
});

/** Credentials mode and headers for API calls outside Better Auth (oRPC). */
export const authCredentials: RequestCredentials = isDesktop ? 'omit' : 'include';

export async function authHeaders(): Promise<Record<string, string>> {
  const token = isDesktop ? readToken() : null;
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Forgets the local session even when the server couldn't be told (e.g. offline). */
export function clearLocalSession() {
  if (isDesktop) writeToken(null);
}

/**
 * Google sign-in. Resolves once signed in; throws an Error with a message for
 * the user, or resolves quietly if the user cancelled.
 */
export async function signInWithGoogle(): Promise<void> {
  if (isDesktop) return signInWithGoogleOnDesktop();

  // Leaves the page for Google, which redirects back here when done.
  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: window.location.origin,
    errorCallbackURL: window.location.origin,
  });
  if (error) {
    const message = googleErrorMessage(error.code);
    if (message) throw new Error(message);
  }
}

/** The error Google sign-in left in the address bar when it redirected back, if any. */
export function takeRedirectError(): string | null {
  if (isDesktop || typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('error');
  if (!code) return null;
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState(null, '', url);
  return googleErrorMessage(code);
}

// Desktop: system browser + deep link.

const DESKTOP_SIGN_IN_TIMEOUT_MS = 10 * 60 * 1000;

type PendingSignIn = {
  state: string;
  resolve: () => void;
  reject: (error: Error) => void;
};

/** The sign-in this window started and is waiting for. A newer attempt replaces it. */
let pending: PendingSignIn | null = null;
let listening: Promise<unknown> | null = null;

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signInWithGoogleOnDesktop(): Promise<void> {
  const [{ openUrl }, { onOpenUrl }] = await Promise.all([
    import('@tauri-apps/plugin-opener'),
    import('@tauri-apps/plugin-deep-link'),
  ]);
  listening ??= onOpenUrl((urls) => {
    for (const url of urls) void handleDeepLink(url);
  });
  await listening;

  // A previous attempt left unfinished in the browser is dropped.
  pending?.resolve();
  const state = randomState();

  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => finish(), DESKTOP_SIGN_IN_TIMEOUT_MS);
    const finish = (error?: Error) => {
      clearTimeout(timer);
      if (pending?.state === state) pending = null;
      if (error) reject(error);
      else resolve();
    };
    pending = { state, resolve: () => finish(), reject: (error) => finish(error) };
  });

  await openUrl(`${apiUrl}${DESKTOP_AUTH_START_PATH}?state=${state}`);
  return done;
}

async function handleDeepLink(link: string) {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return;
  }
  // droid247://auth?state=…&token=… (or &error=…)
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== 'auth') return;

  const current = pending;
  // Only finish a sign-in this window started; ignore crafted or stale links.
  if (!current || url.searchParams.get('state') !== current.state) return;

  const token = url.searchParams.get('token');
  if (!token) {
    const message = googleErrorMessage(url.searchParams.get('error') ?? undefined);
    if (message) current.reject(new Error(message));
    else current.resolve();
    return;
  }

  const { error } = await authClient.oneTimeToken.verify({ token });
  if (error) {
    current.reject(new Error(googleErrorMessage(error.code) ?? "Couldn't sign in with Google."));
    return;
  }
  // The bearer token was stored by onSuccess; load the session with it.
  authClient.$store.notify('$sessionSignal');
  current.resolve();
}
