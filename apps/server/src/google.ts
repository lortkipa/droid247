import { AUTH_PATHS } from "@droid247/shared";
import type { GoogleConfig } from "./config.ts";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** The parts of a Google ID token we use. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/** Google's side of the OAuth code flow. Swappable so tests never talk to Google. */
export interface GoogleOAuth {
  /** Where to send the browser. `challenge` is the PKCE S256 challenge. */
  authUrl(state: string, challenge: string): string;
  /** Redeems the code from the callback. */
  exchange(code: string, verifier: string): Promise<GoogleIdentity>;
}

export function createGoogleOAuth(config: GoogleConfig): GoogleOAuth {
  const redirectUri = `${config.publicUrl}${AUTH_PATHS.googleCallback}`;

  return {
    authUrl(state, challenge) {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      });
      return `${AUTH_ENDPOINT}?${params}`;
    },

    async exchange(code, verifier) {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          code_verifier: verifier,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        throw new Error(`Google token endpoint answered ${res.status}: ${await res.text()}`);
      }
      const { id_token: idToken } = (await res.json()) as { id_token?: string };
      if (!idToken) throw new Error("Google returned no id_token");

      // The token came straight from Google over TLS, so its claims can be read
      // without checking the signature. Still make sure it was issued for us.
      const claims = decodeJwtPayload(idToken);
      if (!ISSUERS.has(String(claims.iss)) || claims.aud !== config.clientId) {
        throw new Error("Google id_token has an unexpected issuer or audience");
      }
      if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
        throw new Error("Google id_token is missing sub or email");
      }
      return {
        sub: claims.sub,
        email: claims.email,
        emailVerified: claims.email_verified === true || claims.email_verified === "true",
        name: typeof claims.name === "string" ? claims.name : null,
        picture: typeof claims.picture === "string" ? claims.picture : null,
      };
    },
  };
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const payload = jwt.split(".")[1];
  if (!payload) throw new Error("Malformed id_token");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}
