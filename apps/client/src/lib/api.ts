import { createApiClient } from '@droid247/api-client';
import { API_DEFAULT_PORT } from '@droid247/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Works out where the API server is:
 * 1. EXPO_PUBLIC_API_URL, if set.
 * 2. Web and desktop (Tauri): localhost.
 * 3. Native in development: the machine running the Expo dev server, taken
 *    from the Metro host. This covers physical phones on the same Wi-Fi.
 * 4. Android emulator: 10.0.2.2 is the emulator's alias for the host machine.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  if (Platform.OS === 'web') {
    return `http://localhost:${API_DEFAULT_PORT}`;
  }

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  const isLoopback = !devHost || devHost === 'localhost' || devHost === '127.0.0.1';

  if (isLoopback) {
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    return `http://${host}:${API_DEFAULT_PORT}`;
  }
  return `http://${devHost}:${API_DEFAULT_PORT}`;
}

export const apiUrl = resolveApiUrl();
export const api = createApiClient(apiUrl);
