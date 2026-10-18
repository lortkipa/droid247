# Droid247

Droid247 is an AI agent that runs 24/7 in the cloud. Users give it tasks from any device, and the agent keeps working on the server even when the user's computer or phone is off. Clients are thin: they create and steer tasks, stream progress, and receive results and notifications.

Every user gets their own cloud virtual machine, and the agent works inside it. The agent can do anything a human can do on a computer: browse the web, write and run code, manage email and calendars, and use other services.

## Status

Early stage. A working skeleton exists: `apps/server` serves a `health` procedure, and `apps/client` (web, Android, iOS) and `apps/desktop` (Tauri) show the backend status. Everything else in the stack and layout below is still the agreed plan. Update this file whenever something is built or a decision changes.

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
- **Database:** PostgreSQL with Drizzle ORM; migrations in `packages/db`.
- **Auth:** Better Auth (works with web, Expo and Tauri). Two sign-in methods only: passwordless email (one-time verification code via the email OTP plugin) and Google OAuth. No passwords.
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
  db/          Drizzle schema, migrations, DB helpers (server/worker only) (planned)
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
| `pnpm dev:server` | API server only, http://localhost:3000 (`tsx watch`) |
| `pnpm dev:web` | Server + Expo web on http://localhost:8081 |
| `pnpm dev:desktop` | Server + Tauri window (Tauri starts the Expo dev server itself) |
| `pnpm dev:android` | Server + Expo Go on a running Android emulator |
| `pnpm dev:ios` | Server + Expo Go on the iOS Simulator (macOS only) |
| `pnpm dev:mobile` | Server + Expo dev server with a QR code for a real phone |
| `pnpm typecheck` | `tsc --noEmit` in every workspace |
| `pnpm build` | Server bundle (`apps/server/dist`, tsup) + web export (`apps/client/dist`) |
| `pnpm build:desktop` | Tauri release build and installers for the current OS |

No lint or test setup yet; add them here when they exist.

### Workspace conventions

- Internal packages (`@droid247/*`) export TypeScript source (`"exports": "./src/index.ts"`); there is no per-package build. Metro and tsx consume the source directly, and the server's tsup build bundles them (`noExternal`).
- `.npmrc` sets `node-linker=hoisted` because React Native / Metro expect a flat `node_modules`.
- Add Expo packages with `npx expo install <pkg>` from `apps/client` so versions match the Expo SDK (currently 58).
- Expo Router routes live in `apps/client/src/app/`; other client code in `apps/client/src/lib/`. The `@/` import alias points to `apps/client/src/`.
- Per-turbo-task dev scripts: server has `dev`, client has `dev:web` / `dev:android` / `dev:ios` / `dev:mobile`, desktop has `dev:desktop`; root scripts combine them with `--filter`.
- App icons in `apps/client/assets/` and `apps/desktop/src-tauri/icons/` are copies of `brand/logo/exports/`; re-copy if the logo changes.

### How the client finds the server

`apps/client/src/lib/api.ts`: `EXPO_PUBLIC_API_URL` if set; else web/desktop use `http://localhost:3000`; native uses the Expo dev server host (from `Constants.expoConfig.hostUri`) on port 3000, falling back to `10.0.2.2` on Android and `localhost` on iOS. The server binds `0.0.0.0` so emulators and phones can reach it. Server env (`PORT`, `HOST`, `CORS_ORIGIN`) is validated with Zod in `apps/server/src/env.ts`; see `.env.example`.

## Keeping this file current

Always keep `CLAUDE.md` up to date with the project. When you add an app or package, change the stack, add a command, or make an architectural decision, update the relevant section in the same change. Keep the **Commands** section, `README.md` and `docs/setup.md` in sync when commands or prerequisites change.
