import { expoClient } from '@better-auth/expo/client';
import { APP_SCHEME } from '@droid247/shared';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { commonAuthPlugins, googleErrorMessage } from './auth-plugins';
import { apiUrl } from './server-url';

/**
 * Better Auth client for Android and iOS. The session cookie is kept in
 * SecureStore and sent with every request. Google sign-in opens an in-app
 * browser session that returns to the app through a deep link (exp:// in
 * Expo Go, droid247:// in a standalone build).
 */
export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    expoClient({ scheme: APP_SCHEME, storagePrefix: 'droid247', storage: SecureStore }),
    ...commonAuthPlugins,
  ],
});

/** Credentials mode and headers for API calls outside Better Auth (oRPC). */
export const authCredentials: RequestCredentials = 'omit';

export async function authHeaders(): Promise<Record<string, string>> {
  const cookie = await authClient.getCookie();
  return cookie ? { cookie } : {};
}

/** The expo plugin clears its stored cookie on sign-out by itself. */
export function clearLocalSession() {}

/**
 * Google sign-in. Resolves once signed in; throws an Error with a message for
 * the user, or resolves quietly if the user cancelled.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
  if (error) {
    const message = googleErrorMessage(error.code);
    if (message) throw new Error(message);
  }
}

/** Only the web build comes back from Google through a page redirect. */
export function takeRedirectError(): string | null {
  return null;
}
