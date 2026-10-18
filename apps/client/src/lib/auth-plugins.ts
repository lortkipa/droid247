import { emailOTPClient, inferAdditionalFields } from 'better-auth/client/plugins';

/** Better Auth client plugins every platform uses; mirrors the server config in apps/server/src/auth.ts. */
export const commonAuthPlugins = [
  emailOTPClient(),
  inferAdditionalFields({
    user: { onboarded: { type: 'boolean', required: true, input: false } },
  }),
];

/** User-facing text for a failed Google sign-in. Null when the user just cancelled. */
export function googleErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'access_denied':
      return null;
    case 'PROVIDER_NOT_FOUND':
    case 'google_unavailable':
      return "Google sign-in isn't set up on the server.";
    default:
      return "Couldn't sign in with Google. Try again.";
  }
}
