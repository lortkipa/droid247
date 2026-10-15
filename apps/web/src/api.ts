import { ApiError, createApiClient } from "@droid247/client";
import { API_URL } from "./config.ts";

const TOKEN_KEY = "droid247.session";

// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Signed in for this run only.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored.
  }
}

export const api = createApiClient({ baseUrl: API_URL, getToken: loadToken });

/** A message fit to show the user for any error thrown by `api`. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) return err.message;
    if (err.kind === "network" || err.kind === "timeout") {
      return "Couldn't reach droid247. Check your connection and try again.";
    }
  }
  return "Something went wrong. Try again.";
}
