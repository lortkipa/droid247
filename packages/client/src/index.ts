import {
  API_VERSION,
  ApiErrorBody,
  AUTH_PATHS,
  type ErrorCode,
  HEALTH_PATH,
  HealthResponse,
  isCompatibleApiVersion,
  Session,
  User,
  VerifyCodeResponse,
} from "@droid247/shared";

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
  /** Session token sent as `Authorization: Bearer …` on signed-in calls. */
  getToken?: () => string | null;
}

export type ApiErrorKind = "network" | "timeout" | "http" | "invalid-response" | "incompatible";

export class ApiError extends Error {
  /** HTTP status, for `http` errors. */
  readonly status?: number;
  /** Server error code, when the response body carried one. */
  readonly code?: ErrorCode;

  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    options?: { cause?: unknown; status?: number; code?: ErrorCode },
  ) {
    super(message, options);
    this.name = "ApiError";
    this.status = options?.status;
    this.code = options?.code;
  }
}

export interface HealthResult {
  health: HealthResponse;
  latencyMs: number;
}

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export function createApiClient({
  baseUrl,
  fetch: fetchImpl,
  timeoutMs = 5000,
  getToken,
}: ApiClientOptions) {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  const root = baseUrl.replace(/\/+$/, "");

  async function request(
    method: string,
    path: string,
    { body, auth = false }: { body?: unknown; auth?: boolean } = {},
  ): Promise<unknown> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (auth) {
      const token = getToken?.();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await doFetch(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
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
      const parsed = ApiErrorBody.safeParse(await res.json().catch(() => undefined));
      throw new ApiError(
        "http",
        parsed.success
          ? parsed.data.message
          : `${root}${path} answered ${res.status} ${res.statusText}`,
        { status: res.status, code: parsed.success ? parsed.data.error : undefined },
      );
    }
    if (res.status === 204) return undefined;
    try {
      return await res.json();
    } catch (err) {
      throw new ApiError("invalid-response", `${root}${path} did not return JSON`, { cause: err });
    }
  }

  function parse<T>(schema: Schema<T>, body: unknown, what: string): T {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("invalid-response", `Unexpected ${what} response from server`, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  return {
    baseUrl: root,

    /** Checks that the backend is reachable and speaks a compatible API version. */
    async health(): Promise<HealthResult> {
      const started = performance.now();
      const body = await request("GET", HEALTH_PATH);
      const latencyMs = Math.round(performance.now() - started);

      const health = parse(HealthResponse, body, "health");
      if (!isCompatibleApiVersion(health.apiVersion)) {
        throw new ApiError(
          "incompatible",
          `Server speaks API ${health.apiVersion}, this app needs ${API_VERSION}. Update the app.`,
        );
      }
      return { health, latencyMs };
    },

    /** Emails a one-time sign-in code. Any earlier code for this email stops working. */
    async requestCode(email: string): Promise<void> {
      await request("POST", AUTH_PATHS.requestCode, { body: { email } });
    },

    /** Checks a code. Every attempt uses the code up, right or wrong. */
    async verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
      const body = await request("POST", AUTH_PATHS.verifyCode, { body: { email, code } });
      return parse(VerifyCodeResponse, body, "verify");
    },

    /** Creates the account for a verified email. */
    async signup(signupToken: string, name: string): Promise<Session> {
      const body = await request("POST", AUTH_PATHS.signup, { body: { signupToken, name } });
      return parse(Session, body, "signup");
    },

    async me(): Promise<User> {
      return parse(User, await request("GET", AUTH_PATHS.me, { auth: true }), "user");
    },

    async logout(): Promise<void> {
      await request("POST", AUTH_PATHS.logout, { auth: true });
    },

    async deleteAccount(): Promise<void> {
      await request("DELETE", AUTH_PATHS.me, { auth: true });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
