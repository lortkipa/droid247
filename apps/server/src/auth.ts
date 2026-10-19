import { expo } from '@better-auth/expo';
import { schema } from '@droid247/db';
import { APP_SCHEME } from '@droid247/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, emailOTP, oneTimeToken } from 'better-auth/plugins';

import { db } from './db';
import { sendSignInCode } from './email';
import { env } from './env';

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: 'select_account' as const,
      }
    : undefined;

if (!google) {
  console.warn('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set: Google sign-in is disabled.');
}

/**
 * Sign-in for every client: Google OAuth and passwordless email codes. Both end
 * in the same account for the same email address. Name and photo are taken
 * only when the account is created (Better Auth's defaults leave them alone on
 * later sign-ins and when linking), and the app asks for the name once, while
 * `onboarded` is false.
 *
 * Sessions: web uses cookies, phones keep the cookie in SecureStore (expo
 * plugin), desktop sends a bearer token (bearer plugin) that it gets from a
 * one-time token after signing in through the system browser.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  trustedOrigins: [
    ...env.corsOrigins,
    `${APP_SCHEME}://`,
    // Expo Go opens the app through exp:// links.
    ...(env.isProduction ? [] : ['exp://']),
  ],
  user: {
    additionalFields: {
      onboarded: { type: 'boolean', required: true, defaultValue: false, input: false },
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ['google'] },
  },
  socialProviders: google ? { google } : {},
  plugins: [
    emailOTP({
      // Random 6-digit code (Better Auth's default generator). Better Auth logs
      // a failed send and still answers success, so the app can't tell.
      sendVerificationOTP: ({ email, otp }) => sendSignInCode(email, otp),
      // Better Auth takes seconds.
      expiresIn: env.SIGN_IN_CODE_TTL_MINUTES * 60,
      // One try per code, like the app shows it: a wrong code locks it out.
      allowedAttempts: 1,
      storeOTP: 'hashed',
    }),
    oneTimeToken({ storeToken: 'hashed' }),
    bearer(),
    expo(),
  ],
});

export type Session = typeof auth.$Infer.Session;
