import { API_DEFAULT_PORT } from '@droid247/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Works out where the API server is:
 * 1. EXPO_PUBLIC_API_URL, if set.
 * 2. Web and desktop (Tauri): localhost.
 * 3. iOS simulator and Android emulator: localhost too. Google sign-in needs
 *    the app to reach the server at the same address Google redirects back to
 *    (BETTER_AUTH_URL, http://localhost:3000 by default). The Android emulator
 *    gets there through `adb reverse tcp:3000 tcp:3000`, which `pnpm dev:android` runs.
 * 4. A real phone in development: the machine running the Expo dev server,
 *    taken from the Metro host (same Wi-Fi). Google sign-in there needs a public
 *    HTTPS URL in both EXPO_PUBLIC_API_URL and BETTER_AUTH_URL (e.g. a tunnel).
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  const localhost = `http://localhost:${API_DEFAULT_PORT}`;
  if (Platform.OS === 'web' || !Device.isDevice) {
    return localhost;
  }

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  const isLoopback = !devHost || devHost === 'localhost' || devHost === '127.0.0.1';
  return isLoopback ? localhost : `http://${devHost}:${API_DEFAULT_PORT}`;
}

export const apiUrl = resolveApiUrl();
