import { useState } from "react";
import { Login } from "./Login.tsx";
import { Mark } from "./Mark.tsx";

export function App() {
  // Bumping the key remounts the flow back at its first step.
  const [flow, setFlow] = useState(0);

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
        <Login key={flow} />
      </main>

      {/* Placeholders until the pages exist. */}
      <footer>
        <span>Terms</span>
        <span>Privacy Policy</span>
      </footer>
    </>
  );
}
