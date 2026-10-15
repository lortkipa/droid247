import { API_VERSION, HEALTH_PATH, HealthResponse, isCompatibleApiVersion } from "@droid247/shared";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** Base URL of the backend, e.g. `http://localhost:8787`. */
  baseUrl: string;
  /**
   * HTTP implementation. Defaults to the global `fetch`. Swap it for a
   * platform-specific one (e.g. `@tauri-apps/plugin-http`) if a shell ever
   * needs to bypass webview networking rules.
   */
  fetch?: FetchLike;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
}

export type ApiErrorKind = "network" | "timeout" | "http" | "invalid-response" | "incompatible";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

export interface HealthResult {
  health: HealthResponse;
  latencyMs: number;
}

export function createApiClient({ baseUrl, fetch: fetchImpl, timeoutMs = 5000 }: ApiClientOptions) {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  const root = baseUrl.replace(/\/+$/, "");

  async function getJson(path: string): Promise<unknown> {
    let res: Response;
    try {
      res = await doFetch(`${root}${path}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new ApiError("timeout", `No response from ${root} within ${timeoutMs} ms`, {
          cause: err,
        });
      }
      throw new ApiError("network", `Could not reach ${root}`, { cause: err });
    }
    if (!res.ok) {
      throw new ApiError("http", `${root}${path} answered ${res.status} ${res.statusText}`);
    }
    try {
      return await res.json();
    } catch (err) {
      throw new ApiError("invalid-response", `${root}${path} did not return JSON`, { cause: err });
    }
  }

  return {
    baseUrl: root,

    /** Checks that the backend is reachable and speaks a compatible API version. */
    async health(): Promise<HealthResult> {
      const started = performance.now();
      const body = await getJson(HEALTH_PATH);
      const latencyMs = Math.round(performance.now() - started);

      const parsed = HealthResponse.safeParse(body);
      if (!parsed.success) {
        throw new ApiError("invalid-response", "Unexpected health response from server", {
          cause: parsed.error,
        });
      }
      if (!isCompatibleApiVersion(parsed.data.apiVersion)) {
        throw new ApiError(
          "incompatible",
          `Server speaks API ${parsed.data.apiVersion}, this app needs ${API_VERSION}. Update the app.`,
        );
      }
      return { health: parsed.data, latencyMs };
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
