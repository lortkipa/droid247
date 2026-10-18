import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Mock sign-in. Nothing talks to the server and nothing is stored: the session
 * lives in memory and is gone after a restart or page refresh.
 */

/** The only code the mock accepts. */
export const MOCK_VERIFICATION_CODE = '123456';

/** The account "Continue with Google" signs in as. */
const MOCK_GOOGLE_ACCOUNT = {
  name: 'Alex Carter',
  email: 'alex.carter@gmail.com',
  avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
};

export type User = {
  name: string;
  email: string;
  /** Profile photo; null means the default avatar. */
  avatarUrl: string | null;
};

export type AuthState =
  | { stage: 'signedOut' }
  | { stage: 'verifying'; email: string; failed: boolean }
  | { stage: 'naming'; email: string; suggestedName: string; avatarUrl: string | null }
  | { stage: 'signedIn'; user: User };

type AuthActions = {
  requestEmailCode: (email: string) => void;
  /** Checks the code once; a wrong code marks the attempt as failed. */
  verifyCode: (code: string) => void;
  changeEmail: () => void;
  continueWithGoogle: () => void;
  completeName: (name: string) => void;
  logOut: () => void;
  deleteAccount: () => void;
};

type AuthContextValue = { state: AuthState } & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT: AuthState = { stage: 'signedOut' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(SIGNED_OUT);

  const actions = useMemo<AuthActions>(
    () => ({
      requestEmailCode: (email) => setState({ stage: 'verifying', email, failed: false }),
      verifyCode: (code) =>
        setState((s) => {
          if (s.stage !== 'verifying' || s.failed) return s;
          return code === MOCK_VERIFICATION_CODE
            ? { stage: 'naming', email: s.email, suggestedName: '', avatarUrl: null }
            : { ...s, failed: true };
        }),
      changeEmail: () => setState(SIGNED_OUT),
      continueWithGoogle: () =>
        setState({
          stage: 'naming',
          email: MOCK_GOOGLE_ACCOUNT.email,
          suggestedName: MOCK_GOOGLE_ACCOUNT.name,
          avatarUrl: MOCK_GOOGLE_ACCOUNT.avatarUrl,
        }),
      completeName: (name) =>
        setState((s) =>
          s.stage === 'naming'
            ? { stage: 'signedIn', user: { name, email: s.email, avatarUrl: s.avatarUrl } }
            : s,
        ),
      logOut: () => setState(SIGNED_OUT),
      // Nothing is stored, so deleting the mock account is the same as signing out.
      deleteAccount: () => setState(SIGNED_OUT),
    }),
    [],
  );

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);
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
