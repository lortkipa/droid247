# droid247

An AI agent that runs 24/7 in the cloud, so it keeps working even when your computer is off.

This is a pnpm monorepo: a TypeScript backend, one React UI and a Tauri shell that wraps that UI for desktop (and later mobile).

```
apps/
  server/    @droid247/server  Hono on Node: the cloud backend
  web/       @droid247/web     React + Vite UI, used by every platform
  native/    @droid247/native  Tauri 2 shell (desktop now, Android/iOS later)
packages/
  shared/    @droid247/shared  API contract: zod schemas, types, API_VERSION
  client/    @droid247/client  Typed API client used by the UI
brand/                         Logo + app icons (see brand/README.md)
```

## Prerequisites

- Node 22.13+ (for the built-in `node:sqlite`) and pnpm 11 (`corepack enable` picks up the pinned version)
- Desktop only: Rust (stable) and the [Tauri system dependencies](https://tauri.app/start/prerequisites/). On Linux that's `webkit2gtk-4.1`, `libsoup3` and `librsvg`.
- Docker, for the production server image (optional)

```bash
pnpm install
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Backend on :8787 + web UI on http://localhost:5173, both hot-reloading |
| `pnpm dev:desktop` | Backend + the desktop app window (Tauri starts the UI dev server itself) |
| `pnpm build` | Production build of the backend (`apps/server/dist`) and web UI (`apps/web/dist`) |
| `pnpm start` | Runs the production builds: backend on :8787, web UI preview on http://localhost:4173 |
| `pnpm build:desktop` | Desktop installers in `apps/native/src-tauri/target/release/bundle/` |
| `pnpm docker:up` | Builds and runs the backend's production Docker image on :8787 |
| `pnpm test` | Unit tests (vitest) |
| `pnpm typecheck` | `tsc` in every package |
| `pnpm lint` / `pnpm format` | Biome check / auto-fix |

## Sign-in

Email + one-time code, or Google, handled by the server (`apps/server/src/auth.ts`):

| Endpoint | What it does |
|---|---|
| `POST /auth/code` | Emails a 6-digit code, valid for 10 minutes. Requesting a new one replaces the old one. |
| `POST /auth/verify` | Checks the code. Any attempt uses it up, so a wrong code means requesting a new one. Returns a session for an existing account, or a signup ticket for a new email. |
| `POST /auth/signup` | Creates the account from a signup ticket plus a name. This is the only time the name is asked. |
| `GET /auth/me` / `DELETE /auth/me` | The signed-in user / deletes the account. |
| `POST /auth/logout` | Ends the current session. |
| `GET /auth/google/start` | Browser navigation: sends the user to Google. `return_to` must be a UI origin from `CORS_ORIGINS` or a `http://127.0.0.1:<port>` loopback (the desktop app). |
| `GET /auth/google/callback` | Google comes back here; the browser is sent on to `return_to?google_ticket=…` (or `google_error=…`). |
| `POST /auth/google/finish` | Trades the ticket plus the nonce the app started with for a session, or a signup ticket with the Google name and photo. |

Sessions are bearer tokens (`Authorization: Bearer …`), valid for 30 days. The UI keeps the token in `localStorage`. Accounts, codes and sessions live in SQLite (Node's built-in `node:sqlite`). Without SMTP settings the server prints codes to its console, which is all you need for local development.

Accounts are matched by email, so both methods reach the same account. Whichever method created the account sets its name and avatar (the Google photo, or a default silhouette for email accounts), and signing in with the other method never changes them. On the web, Google sign-in is a full-page redirect. The desktop app opens the system browser instead, because Google blocks embedded webviews, and catches the redirect on a `127.0.0.1` port (`tauri-plugin-oauth`). The page left in the browser then opens a `droid247://` link to bring the app back to the front; the browser asks before opening it the first time. Dev builds register that scheme on first run (on Linux, a handler file in `~/.local/share/applications`). The desktop app is single-instance: launching it again brings the open window forward. Google needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`; without them the button reports that it isn't set up.

## Configuration

See [`.env.example`](.env.example).

- **Backend:** `PORT` (default 8787), `HOST`, `CORS_ORIGINS`, `DATABASE_PATH`, and `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` for sending codes, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`PUBLIC_URL` for Google sign-in. Put them in `.env` at the repo root. The default CORS list allows the Vite dev/preview servers and the Tauri webview origins. Docker keeps the database in the `data` volume.
- **UI / desktop builds:** `VITE_API_URL` is baked in at build time and falls back to `http://localhost:8787`. For a real deployment, set it in `apps/web/.env.production.local` or the environment before `pnpm build` / `pnpm build:desktop`.

## Adding mobile later

Everything the Tauri mobile targets need is already in place:

- the Rust entry point (`apps/native/src-tauri/src/lib.rs`) has `mobile_entry_point`
- the UI is responsive and safe-area aware
- the Vite dev server honours `TAURI_DEV_HOST`
- the backend allows the Tauri origins
- Android/iOS icons exist in `brand/icons/`

Mobile needs the Android SDK/NDK or Xcode installed. With those in place, start with:

```bash
pnpm --filter @droid247/native tauri android init
```

Then add `dev:android` / `build:android` scripts alongside the desktop ones.
