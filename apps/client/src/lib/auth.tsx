import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api } from './api';
import { authClient, clearLocalSession, signInWithGoogle, takeRedirectError } from './auth-client';

/**
 * Sign-in state for the whole app, backed by Better Auth on the server.
 * Google and Email on the same address are the same account. A new account
 * asks for a name once (pre-filled from Google); after that the stored name
 * and photo are kept, whichever way the user signs in.
 */

export type User = {
  name: string;
  email: string;
  /** Profile photo; null means the default avatar. */
  avatarUrl: string | null;
};

export type AuthState =
  /** Checking for a saved session at startup. */
  | { stage: 'loading' }
  | { stage: 'signedOut' }
  | { stage: 'verifying'; email: string; failed: boolean }
  /** Signed in to a new account that has no confirmed name yet. */
  | { stage: 'naming'; email: string; suggestedName: string; avatarUrl: string | null }
  | { stage: 'signedIn'; user: User };

type AuthActions = {
  requestEmailCode: (email: string) => Promise<void>;
  /** Checks the code once; a wrong code marks the attempt as failed. */
  verifyCode: (code: string) => Promise<void>;
  changeEmail: () => Promise<void>;
  continueWithGoogle: () => Promise<void>;
  completeName: (name: string) => Promise<void>;
  logOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

type AuthContextValue = {
  state: AuthState;
  /** A request is running; buttons that start another one are disabled. */
  busy: boolean;
  /** The last thing that went wrong, for the current screen to show. */
  error: string | null;
} & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

type Verifying = { email: string; failed: boolean };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const [verifying, setVerifying] = useState<Verifying | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(takeRedirectError);

  const sessionUser = session.data?.user ?? null;

  // Signed in: the email code step is over.
  useEffect(() => {
    if (sessionUser) setVerifying(null);
  }, [sessionUser]);

  const state = useMemo<AuthState>(() => {
    if (sessionUser) {
      const avatarUrl = sessionUser.image ?? null;
      return sessionUser.onboarded
        ? {
            stage: 'signedIn',
            user: { name: sessionUser.name, email: sessionUser.email, avatarUrl },
          }
        : {
            stage: 'naming',
            email: sessionUser.email,
            suggestedName: sessionUser.name,
            avatarUrl,
          };
    }
    if (session.isPending) return { stage: 'loading' };
    if (verifying) return { stage: 'verifying', ...verifying };
    return { stage: 'signedOut' };
  }, [sessionUser, session.isPending, verifying]);

  const actions = useMemo<AuthActions>(() => {
    /** Runs one request at a time, clearing the previous error first. */
    const run = async (task: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await task();
      } finally {
        setBusy(false);
      }
    };

    const signOut = async () => {
      try {
        await authClient.signOut();
      } finally {
        clearLocalSession();
        // Reload the session even if the server couldn't be reached.
        authClient.$store.notify('$sessionSignal');
      }
    };

    return {
      requestEmailCode: (email) =>
        run(async () => {
          const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
          if (error) {
            setError("Couldn't send the code. Check your connection and try again.");
            return;
          }
          setVerifying({ email, failed: false });
        }),

      verifyCode: async (code) => {
        if (!verifying || verifying.failed) return;
        await run(async () => {
          const { error } = await authClient.signIn.emailOtp({ email: verifying.email, otp: code });
          if (error) setVerifying({ ...verifying, failed: true });
        });
      },

      changeEmail: async () => {
        setVerifying(null);
        setError(null);
        // From the name screen the user is already signed in to the new
        // account; it stays without a name and asks again next time.
        if (sessionUser) await run(signOut);
      },

      continueWithGoogle: async () => {
        // Not tied to `busy`: the user may abandon Google in the browser and
        // must be able to start again.
        setError(null);
        try {
          await signInWithGoogle();
        } catch (e) {
          setError(messageOf(e, "Couldn't sign in with Google. Try again."));
        }
      },

      completeName: (name) =>
        run(async () => {
          try {
            await api.account.completeProfile({ name });
          } catch (e) {
            // CONFLICT: the name was already set (e.g. from another device); keep that one.
            if ((e as { code?: unknown }).code !== 'CONFLICT') {
              setError(messageOf(e, "Couldn't save your name. Try again."));
              return;
            }
          }
          await session.refetch();
        }),

      logOut: () => run(signOut),

      deleteAccount: () =>
        run(async () => {
          try {
            await api.account.delete();
          } catch (e) {
            setError(messageOf(e, "Couldn't delete the account. Try again."));
            return;
          }
          await signOut().catch(() => undefined);
        }),
    };
  }, [verifying, sessionUser, session]);

  const value = useMemo(() => ({ state, busy, error, ...actions }), [state, busy, error, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}

/** The auth state narrowed to one stage, for screens that only exist in that stage. */
export function useAuthStage<S extends AuthState['stage']>(
  stage: S,
): Extract<AuthState, { stage: S }> | null {
  const { state } = useAuth();
  return state.stage === stage ? (state as Extract<AuthState, { stage: S }>) : null;
}
