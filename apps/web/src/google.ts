import { ApiError } from "@droid247/client";
import { GOOGLE_RETURN_PARAMS, GoogleReturnError, type VerifyCodeResponse } from "@droid247/shared";
import { api, errorMessage } from "./api.ts";
import { openBrowserSignIn } from "./platform.ts";

const NONCE_KEY = "droid247.google-nonce";

const RETURN_ERRORS: Record<GoogleReturnError, string | null> = {
  // Backing out isn't an error worth showing.
  cancelled: null,
  unavailable: "Google sign-in isn't set up on this server yet. Use your email instead.",
  unverified: "Your Google account's email isn't verified. Use your email instead.",
  failed: "Google sign-in didn't go through. Try again.",
};

/** A Google sign-in that ended without an account. `userMessage` is null when the user cancelled. */
export class GoogleSignInError extends Error {
  constructor(readonly userMessage: string | null) {
    super(userMessage ?? "Google sign-in cancelled");
    this.name = "GoogleSignInError";
  }
}

/** A message fit to show the user, or null when there's nothing to say. */
export function googleErrorMessage(err: unknown): string | null {
  if (err instanceof GoogleSignInError) return err.userMessage;
  if (err instanceof ApiError) return errorMessage(err);
  return RETURN_ERRORS.failed;
}

// The nonce proves the sign-in coming back is the one this app started. It
// survives the web page navigating away to Google and back.
function saveNonce(nonce: string) {
  try {
    sessionStorage.setItem(NONCE_KEY, nonce);
  } catch {
    // Without storage a web sign-in can't be finished; the server will say so.
  }
}

function takeNonce(): string {
  try {
    const nonce = sessionStorage.getItem(NONCE_KEY);
    sessionStorage.removeItem(NONCE_KEY);
    return nonce ?? "";
  } catch {
    return "";
  }
}

/** Trades the server's redirect parameters for a session or a signup ticket. */
async function finish(params: URLSearchParams): Promise<VerifyCodeResponse> {
  const nonce = takeNonce();
  const ticket = params.get(GOOGLE_RETURN_PARAMS.ticket);
  if (ticket) return api.googleFinish(ticket, nonce);
  const error = GoogleReturnError.safeParse(params.get(GOOGLE_RETURN_PARAMS.error));
  throw new GoogleSignInError(RETURN_ERRORS[error.success ? error.data : "failed"]);
}

/**
 * Signs in with Google. On the web the page navigates away and this resolves
 * with null; the result is picked up by `returnedGoogleSignIn` when the app reloads.
 */
export async function signInWithGoogle(signal: AbortSignal): Promise<VerifyCodeResponse | null> {
  const nonce = crypto.randomUUID();
  saveNonce(nonce);
  let landed: URL | null;
  try {
    landed = await openBrowserSignIn((returnTo) => api.googleStartUrl(returnTo, nonce), signal);
  } catch (err) {
    if (signal.aborted) return null;
    console.error("Google sign-in failed:", err);
    throw new GoogleSignInError(RETURN_ERRORS.failed);
  }
  return landed && finish(landed.searchParams);
}

/** Reads (and removes) the parameters a web Google sign-in returned with. */
function fromAddressBar(): Promise<VerifyCodeResponse> | null {
  const url = new URL(window.location.href);
  const keys = Object.values(GOOGLE_RETURN_PARAMS);
  if (!keys.some((key) => url.searchParams.has(key))) return null;

  const params = new URLSearchParams(url.searchParams);
  for (const key of keys) url.searchParams.delete(key);
  // Keep the one-time ticket out of history and bookmarks.
  window.history.replaceState(window.history.state, "", url);
  return finish(params);
}

// Started once at load, so React remounting (StrictMode, sign-out) can't claim it twice.
let returned = fromAddressBar();
// Whoever claims it handles failures; this just keeps an early rejection from being reported as unhandled.
returned?.catch(() => {});

/** The web Google sign-in this page load came back from, if any. */
export function returnedGoogleSignIn(): Promise<VerifyCodeResponse> | null {
  return returned;
}

/** Call once the returned sign-in has been dealt with. */
export function forgetReturnedGoogleSignIn() {
  returned = null;
}
