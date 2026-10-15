import { ApiError } from "@droid247/client";
import type { Session, User } from "@droid247/shared";
import { useEffect, useState } from "react";
import { Account } from "./Account.tsx";
import { api, clearToken, loadToken, saveToken } from "./api.ts";
import { Login } from "./Login.tsx";
import { Mark } from "./Mark.tsx";

type Auth = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: User };

export function App() {
  const [auth, setAuth] = useState<Auth>(() =>
    loadToken() ? { status: "loading" } : { status: "signed-out" },
  );
  // Bumping the key remounts the flow back at its first step.
  const [flow, setFlow] = useState(0);

  // Resume a stored session.
  useEffect(() => {
    if (!loadToken()) return;
    let cancelled = false;
    api.me().then(
      (user) => {
        if (!cancelled) setAuth({ status: "signed-in", user });
      },
      (err) => {
        if (err instanceof ApiError && err.status === 401) clearToken();
        if (!cancelled) setAuth({ status: "signed-out" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function signIn(session: Session) {
    saveToken(session.token);
    setAuth({ status: "signed-in", user: session.user });
  }

  function signOut() {
    clearToken();
    setFlow((n) => n + 1);
    setAuth({ status: "signed-out" });
  }

  if (auth.status === "loading") return null;
  if (auth.status === "signed-in") return <Account user={auth.user} onSignedOut={signOut} />;

  return (
    <>
      <button
        type="button"
        className="brand"
        aria-label="droid247 home"
        onClick={() => setFlow((n) => n + 1)}
      >
        <Mark />
      </button>

      <main>
        <Login key={flow} onSignedIn={signIn} />
      </main>

      {/* Placeholders until the pages exist. */}
      <footer>
        <span>Terms</span>
        <span>Privacy Policy</span>
      </footer>
    </>
  );
}
