import logoBlack from "../../../brand/logo/lockup-horizontal-black.svg";
import logoWhite from "../../../brand/logo/lockup-horizontal-white.svg";
import { getPlatform } from "./platform.ts";
import { useConnection } from "./useConnection.ts";

const platform = getPlatform();

export function App() {
  const { state, apiUrl, retry } = useConnection();

  return (
    <main className="shell">
      <picture className="logo">
        <source srcSet={logoWhite} media="(prefers-color-scheme: dark)" />
        <img src={logoBlack} alt="droid247" />
      </picture>

      <section className="card" aria-live="polite">
        <div className={`status status--${state.status}`}>
          <span className="dot" aria-hidden />
          {state.status === "checking" && "Checking backend…"}
          {state.status === "connected" && "Connected to backend"}
          {state.status === "error" && "Can't reach backend"}
        </div>

        <dl className="facts">
          <dt>API</dt>
          <dd>{apiUrl}</dd>
          <dt>Platform</dt>
          <dd>{platform}</dd>
          {state.status === "connected" && (
            <>
              <dt>Server</dt>
              <dd>
                {state.result.health.service} v{state.result.health.version}
              </dd>
              <dt>API version</dt>
              <dd>{state.result.health.apiVersion}</dd>
              <dt>Latency</dt>
              <dd>{state.result.latencyMs} ms</dd>
            </>
          )}
        </dl>

        {state.status === "error" && <p className="error">{state.message}</p>}

        <button type="button" onClick={retry} disabled={state.status === "checking"}>
          {state.status === "error" ? "Retry" : "Check again"}
        </button>
      </section>
    </main>
  );
}
