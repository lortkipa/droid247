import { expo } from '@better-auth/expo';
import { schema } from '@droid247/db';
import { APP_SCHEME } from '@droid247/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, emailOTP, oneTimeToken } from 'better-auth/plugins';

import { db } from './db';
import { env } from './env';

/**
 * Email delivery isn't built yet: no email is sent and every sign-in code is
 * this one. Replace with a real sender (and random codes) before launch.
 */
const DEV_EMAIL_CODE = '123456';

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
      generateOTP: () => DEV_EMAIL_CODE,
      sendVerificationOTP: async ({ email, type }) => {
        console.log(`[auth] ${type} code for ${email}: ${DEV_EMAIL_CODE} (email sending not implemented)`);
      },
      // One try per code, like the app shows it.
      allowedAttempts: 1,
    }),
    oneTimeToken({ storeToken: 'hashed' }),
    bearer(),
    expo(),
  ],
});

export type Session = typeof auth.$Infer.Session;
