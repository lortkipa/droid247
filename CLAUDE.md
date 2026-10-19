# Droid247

Droid247 is an AI agent that runs 24/7 in the cloud. Users give it tasks from any device, and the agent keeps working on the server even when the user's computer or phone is off. Clients are thin: they create and steer tasks, stream progress, and receive results and notifications.

Every user gets their own cloud virtual machine, and the agent works inside it. The agent can do anything a human can do on a computer: browse the web, write and run code, manage email and calendars, and use other services.

## Status

Early stage. A working skeleton exists: `apps/server` serves a `health` procedure and **real auth** (Better Auth on Postgres, see Auth below), and `apps/client` (web, Android, iOS) and `apps/desktop` (Tauri) sign in and show the backend status. Flow: login (Google or email) → email code → name (only for a new account) → home with the user, the backend status, log out and delete account. Google OAuth and email codes are real: a random 6-digit code is emailed over SMTP (`apps/server/src/email.ts`), valid for `SIGN_IN_CODE_TTL_MINUTES` (default 5) and for one try. Without SMTP settings (development only) the code is printed in the server log. Everything else in the stack and layout below is still the agreed plan. Update this file whenever something is built or a decision changes.

Human-facing docs: `README.md` (run commands, configuration, troubleshooting) and `docs/setup.md` (what to install per OS and platform). Keep them in sync with this file.

## Supported platforms

| Platform | Targets | Delivered by |
| --- | --- | --- |
| Web | Modern browsers | `apps/client` (Expo web export) |
| Desktop | Linux, Windows, macOS | `apps/desktop` (Tauri 2 shell around the web build) |
| Mobile | Android, iOS | `apps/client` (Expo / React Native) |

## Stack

The whole project is TypeScript so code (types, validation, API client, business logic, UI) is written once and shared across the server and every client.

- **Monorepo:** pnpm workspaces + Turborepo.
- **Universal client:** Expo (React Native) with Expo Router. One codebase builds iOS, Android and web (via React Native Web).
- **Desktop:** Tauri 2 wraps the Expo web build for Linux, Windows and macOS. Native desktop features (tray icon, notifications, autostart) live in the Tauri layer only.
- **Styling/UI:** shared React Native components in `packages/ui` (NativeWind / Tailwind classes).
- **API:** Node.js server with Hono. Typed RPC with oRPC: the contract (`oc` routes with Zod schemas) lives in `packages/shared/src/contract.ts` and is the single source of truth; the server implements it (`apps/server/src/router.ts`, mounted at `/rpc`) and clients call it through `createApiClient()` from `packages/api-client`. A plain `GET /health` also exists for curl and health checks.
- **Realtime:** Server-Sent Events / WebSocket to stream agent progress to clients.
- **Live view / takeover:** each VM runs a VNC server; the server proxies it over an authenticated WebSocket and clients show it with noVNC (web/desktop, and a WebView on mobile). Users can watch the agent live and take control.
- **Agent runtime:** long-running worker processes that execute agent tasks independently of any client connection. Uses the Claude API via the Anthropic TypeScript SDK (Claude Agent SDK for the agent loop). Model: Claude Opus 5.5 (`claude-opus-5-5`); the model ID lives in one config constant, `AGENT_MODEL` in `packages/shared/src/config.ts`.
- **Per-user VMs:** each user has a persistent Linux VM (desktop environment + browser + dev tools). The agent controls it through shell/file tools and Claude computer use (screenshots, mouse, keyboard). VMs are created, started, stopped and snapshotted through a `VmProvider` interface so the backend is not tied to one host. First implementation: Incus VMs on the home server. Later: a cloud implementation (e.g. AWS EC2 or Firecracker microVMs).
- **Jobs/scheduling:** Postgres-backed queue (pg-boss) for task runs, retries and scheduled/recurring tasks.
- **Database:** PostgreSQL with Drizzle ORM (postgres-js driver); schema and migrations in `packages/db`. Local dev runs Postgres from `docker-compose.yml` on host port **5433**.
- **Auth:** Better Auth (`apps/server/src/auth.ts`, mounted at `/api/auth/*`). Two sign-in methods only: passwordless email (one-time code via the email OTP plugin) and Google OAuth. No passwords. Details in **Auth** below.
- **Billing:** Stripe subscriptions. Usage limits reset weekly on paid plans and monthly on the free plan.
- **Hosting:** a home server for now, running everything with Docker Compose (server, worker, Postgres) plus Incus for user VMs. Keep everything configured by environment variables and avoid host-specific assumptions so it can move to AWS or another provider later.
- **Push notifications:** Expo Notifications (mobile), Web Push (web), Tauri notification plugin (desktop).

## Repository layout

Entries marked *(planned)* don't exist yet.

```
apps/
  client/      Expo app: iOS, Android, web
  desktop/     Tauri 2 shell that loads the client web build
  server/      Hono HTTP/RPC API, auth, realtime streaming
  worker/      24/7 agent runner: consumes jobs, runs the agent loop (planned)
packages/
  shared/      Zod schemas, types, constants shared by everything
  api-client/  Typed client for the server API (used by all apps)
  ui/          Cross-platform React Native components (planned)
  db/          Drizzle schema, migrations, DB helpers (server/worker only)
  agent/       Agent definition: prompts, tools, Claude SDK wiring (planned)
  vm/          VmProvider interface + implementations (Incus first, cloud later) (planned)
  billing/     Plans, usage metering, weekly/monthly limit resets, Stripe (planned)
brand/logo/    Final logo kit: master SVGs, platform icon exports, brand guidelines
docs/          Developer docs (setup.md: install guide)
```

Rule of thumb: if two apps need the same logic, it belongs in a package, not copied into each app. Platform-specific code uses `.web.tsx` / `.native.tsx` / `.ios.tsx` / `.android.tsx` file suffixes or lives in `apps/desktop`.

## Brand

- Logo: **Cursor Droid**, a mouse cursor with two orange eyes. Guidelines, file choices and per-platform setup are in `brand/logo/README.md`.
- Colours: Ink `#0B0D12`, White `#FFFFFF`, Mist `#F4F6FA`, Signal Orange `#FF5A1F`. Wordmark font: Outfit Bold.
- When scaffolding `apps/client` and `apps/desktop`, take app icons, splash, favicons and notification icons from `brand/logo/exports/`; don't redraw them. The eye expressions in `brand/logo/svg/expressions/` are for in-app task states (working, done, needs you).

## Auth

- **Email codes:** Better Auth's email OTP plugin with its random 6-digit generator, `allowedAttempts: 1` (a wrong code locks that code out; the app then offers a different email), `expiresIn` from `SIGN_IN_CODE_TTL_MINUTES` (also shown in the email), stored hashed in `verification`. A new request replaces the old code. Sent by `sendSignInCode` in `apps/server/src/email.ts` through nodemailer to any SMTP server (free: Gmail with an app password, no domain needed; with an own domain, Brevo or Resend's free tiers). The message (subject, text, branded HTML) is built in `apps/server/src/sign-in-email.ts`; its logo is an inline CID attachment (`apps/server/assets/email-logo.png`), because mail clients don't render SVG and a hosted image wouldn't load from localhost. Better Auth swallows send errors (it logs them and still answers success).
- **One account per email.** Google and email OTP on the same address are the same user (`account.accountLinking` with Google trusted). Email OTP users have no `account` row; Google adds one.
- **Profile set once, at creation.** Google sign-up stores the Google name and photo (`user.image`); email sign-up stores an empty name. The `user.onboarded` column (Better Auth additional field, `input: false`) is false until the user confirms a name on the name screen via `account.completeProfile` (oRPC), which only succeeds while `onboarded` is false. Later sign-ins and linking never change name or photo: keep Better Auth's `updateUserInfoOnLink` and `overrideUserInfoOnSignIn` at their default (false).
- **Delete account** is `account.delete` (oRPC): deletes the user row; sessions and accounts cascade. Better Auth's own `deleteUser` isn't used (it needs a fresh session).
- **Sessions per platform** (client code in `apps/client/src/lib/auth-client.ts` / `.native.ts`; `auth.tsx` derives the screen stage from the session):
  - Web: HTTP-only cookie on the API origin; requests use `credentials: 'include'`, so `CORS_ORIGIN` must list the web origin (no `*`).
  - Phones: `@better-auth/expo` keeps the cookie in SecureStore and sends it as a `cookie` header. Google opens an in-app browser and returns via `exp://` (Expo Go) or `droid247://`.
  - Desktop (detected by `__TAURI_INTERNALS__`): bearer token (Better Auth `bearer` plugin) in localStorage. Google can't run inside the webview, so the app opens `GET /auth/desktop/start?state=…` in the system browser; after Google, `GET /auth/desktop/complete` mints a one-time token (`oneTimeToken` plugin) and opens `droid247://auth?token=…&state=…`. The app accepts only a link whose `state` it generated, then exchanges the token for the session (`apps/server/src/desktop-auth.ts`).
  - oRPC calls carry the same credentials (`createApiClient(url, { headers, credentials })`); procedures that need a user use the `authed` middleware in `apps/server/src/router.ts`.
- **Google redirect** always goes to the server (`<BETTER_AUTH_URL>/api/auth/callback/google`), and the OAuth state cookie only matches if the device reached the server at that same host. That's why simulators and emulators use `localhost` (Android via `adb reverse`, run by `dev:android`) and real phones need a public HTTPS URL in both `BETTER_AUTH_URL` and `EXPO_PUBLIC_API_URL` for Google.
- **Schema changes:** Better Auth tables in `packages/db/src/schema.ts` were generated with `npx auth generate` and Better Auth checks them at startup. When adding a Better Auth plugin with tables or a user field, regenerate (or edit to match), then `pnpm db:generate` and `pnpm db:migrate`.

## Architecture notes

- Live view is view-only by default. When the user takes control, the agent pauses its actions on that VM until the user hands control back. Only the VM's owner can open its live view.
- Clients never run the agent. They create tasks through the API; the worker picks them up from the queue and runs them to completion.
- All task state (status, messages, tool calls, results) is persisted in Postgres so any client can reconnect and resume viewing at any time.
- Server and worker scale independently; the worker must tolerate restarts (resume or retry a task from persisted state).
- A task runs against its owner's VM. The worker starts the VM if it is stopped, runs the agent loop, and may stop idle VMs to save resources. VM disks persist between tasks so the user's files, logins and installed tools survive.
- User VMs are untrusted: they must be network-isolated from the host, the database and each other, and must never hold server secrets.
- Usage (model tokens, VM time) is metered per user and checked against the plan's limit before and during each task.

## Conventions

- TypeScript strict mode everywhere; no `any` without a comment explaining why.
- Validate all external input with Zod schemas from `packages/shared`.
- Keep secrets (Anthropic API key, DB URL, auth secrets) in environment variables, never in the repo.

## Commands

Run from the repo root with pnpm 10 and Node 22+. Every `dev:*` command also starts the API server (via Turborepo).

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspaces |
| `pnpm db:up` | Start Postgres in Docker (`docker-compose.yml`, host port 5433) |
| `pnpm db:migrate` | Apply Drizzle migrations from `packages/db/drizzle` |
| `pnpm db:generate` | Generate a migration after changing `packages/db/src/schema.ts` |
| `pnpm dev:server` | API server only, http://localhost:3000 (`tsx watch`) |
| `pnpm dev:web` | Server + Expo web on http://localhost:8081 |
| `pnpm dev:desktop` | Server + Tauri window (Tauri starts the Expo dev server itself) |
| `pnpm dev:android` | `adb reverse tcp:3000` + server + Expo Go on a running Android emulator |
| `pnpm dev:ios` | Server + Expo Go on the iOS Simulator (macOS only) |
| `pnpm dev:mobile` | Server + Expo dev server with a QR code for a real phone |
| `pnpm typecheck` | `tsc --noEmit` in every workspace |
| `pnpm build` | Server bundle (`apps/server/dist`, tsup) + web export (`apps/client/dist`) |
| `pnpm build:desktop` | Tauri release build and installers for the current OS |

No lint or test setup yet; add them here when they exist.

### Workspace conventions

- Internal packages (`@droid247/*`) export TypeScript source (`"exports": "./src/index.ts"`); there is no per-package build. Metro and tsx consume the source directly, and the server's tsup build bundles them (`noExternal`).
- `.npmrc` sets `node-linker=hoisted` because React Native / Metro expect a flat `node_modules`.
- Add Expo packages with `npx expo install <pkg>` from `apps/client` so versions match the Expo SDK (currently 57). Stay on the SDK that the App Store / Google Play build of Expo Go supports, not the newest on npm: Expo Go in the stores lags new SDK releases, and phones can't run the app otherwise. After changing the SDK, regenerate `pnpm-lock.yaml` from scratch so optional peers (e.g. `@expo/metro-runtime`) don't stay on the old SDK, and check native bundling with `npx expo export --platform android --platform ios`.
- Expo Router routes live in `apps/client/src/app/`, shared screen components in `apps/client/src/components/`, other client code in `apps/client/src/lib/`. The `@/` import alias points to `apps/client/src/`.
- Auth stages are routed with `Stack.Protected` in `src/app/_layout.tsx`: each stage unlocks exactly one screen, so there's nothing to go back to.
- The client follows the system theme (`useTheme()` in `src/lib/theme.ts`: white background in light mode, black in dark mode) and uses Outfit for all text (`fonts` / `typography` there, loaded in the root layout). Use the theme tokens, not hard-coded colours. With custom fonts, pick the weight by `fontFamily`, never `fontWeight`. Keep the look identical on phones: spread `textMetrics` into every text style (turns off Android's extra font padding), use the theme's `selection` / `selectionHighlight` for text inputs (see `TextField`), and set `needsOffscreenAlphaCompositing` on any view faded with `opacity` (Android otherwise fades each layer separately).
- Every screen uses `<Screen>` (logo top left, centred column). The in-app logo (`src/components/Logo.tsx`) draws the `brand/logo/svg/mark.svg` geometry with react-native-svg; keep it in sync if the mark changes.
- `@tauri-apps/plugin-deep-link` and `@tauri-apps/plugin-opener` are dependencies of `apps/client` because their JS bindings run in the web bundle inside Tauri; they're imported dynamically and only when running in Tauri. Their Rust halves and permissions live in `apps/desktop/src-tauri`. `rust-ini` is pinned to 0.21.1 in `Cargo.lock` (0.21.3 breaks `tauri-plugin-deep-link` 2.6.2).
- Per-turbo-task dev scripts: server has `dev`, client has `dev:web` / `dev:android` / `dev:ios` / `dev:mobile`, desktop has `dev:desktop`; root scripts combine them with `--filter`.
- App icons in `apps/client/assets/` and `apps/desktop/src-tauri/icons/`, and the email logo `apps/server/assets/email-logo.png` (from `exports/email/lockup-dark.png`), are copies of `brand/logo/exports/`; re-copy if the logo changes.

### How the client finds the server

`apps/client/src/lib/server-url.ts`: `EXPO_PUBLIC_API_URL` if set; else web, desktop, the iOS simulator and the Android emulator (`!Device.isDevice`) use `http://localhost:3000` (see Google redirect above); a real phone uses the Expo dev server host (from `Constants.expoConfig.hostUri`) on port 3000. The server binds `0.0.0.0` so phones can reach it. Server env (`PORT`, `HOST`, `CORS_ORIGIN`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `SIGN_IN_CODE_TTL_MINUTES`) is loaded from the root `.env` and validated with Zod in `apps/server/src/env.ts`; empty values mean default, and `DATABASE_URL` / `BETTER_AUTH_SECRET` have dev-only defaults and `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` are optional in development, but all are required when `NODE_ENV=production`. See `.env.example`.

## Keeping this file current

Always keep `CLAUDE.md` up to date with the project. When you add an app or package, change the stack, add a command, or make an architectural decision, update the relevant section in the same change. Keep the **Commands** section, `README.md` and `docs/setup.md` in sync when commands or prerequisites change.
