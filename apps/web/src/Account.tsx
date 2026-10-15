import type { User } from "@droid247/shared";
import { useState } from "react";
import { api, errorMessage } from "./api.ts";

/** Temporary signed-in page for testing auth. Deliberately unstyled. */
export function Account({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logOut() {
    setBusy(true);
    // Forget the session locally even if the server can't be reached.
    await api.logout().catch(() => {});
    onSignedOut();
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount();
      onSignedOut();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <button type="button" onClick={logOut} disabled={busy}>
        Log out
      </button>{" "}
      <button type="button" onClick={deleteAccount} disabled={busy}>
        Delete account
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
