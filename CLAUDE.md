# Droid247

Droid247 is an AI agent that runs 24/7 in the cloud. Users give it tasks from any device, and the agent keeps working on the server even when the user's computer or phone is off. Clients are thin: they create and steer tasks, stream progress, and receive results and notifications.

Every user gets their own cloud virtual machine, and the agent works inside it. The agent can do anything a human can do on a computer: browse the web, write and run code, manage email and calendars, and use other services.

## Status

Early stage. The repo has no application code yet, only this file, `LICENSE` and the logo concepts in `brand/logo-concepts/` (25 directions; one will be chosen as the official logo). The stack and layout below are the agreed plan. Update this file whenever something is built or a decision changes.

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
- **API:** Node.js server with Hono. Typed RPC with oRPC (or tRPC) so clients call the server with end-to-end types; Zod schemas in `packages/shared` are the single source of truth.
- **Realtime:** Server-Sent Events / WebSocket to stream agent progress to clients.
- **Live view / takeover:** each VM runs a VNC server; the server proxies it over an authenticated WebSocket and clients show it with noVNC (web/desktop, and a WebView on mobile). Users can watch the agent live and take control.
- **Agent runtime:** long-running worker processes that execute agent tasks independently of any client connection. Uses the Claude API via the Anthropic TypeScript SDK (Claude Agent SDK for the agent loop). Model: Claude Opus 5.5 (`claude-opus-5-5`); keep the model ID in one config constant.
- **Per-user VMs:** each user has a persistent Linux VM (desktop environment + browser + dev tools). The agent controls it through shell/file tools and Claude computer use (screenshots, mouse, keyboard). VMs are created, started, stopped and snapshotted through a `VmProvider` interface so the backend is not tied to one host. First implementation: Incus VMs on the home server. Later: a cloud implementation (e.g. AWS EC2 or Firecracker microVMs).
- **Jobs/scheduling:** Postgres-backed queue (pg-boss) for task runs, retries and scheduled/recurring tasks.
- **Database:** PostgreSQL with Drizzle ORM; migrations in `packages/db`.
- **Auth:** Better Auth (works with web, Expo and Tauri). Two sign-in methods only: passwordless email (one-time verification code via the email OTP plugin) and Google OAuth. No passwords.
- **Billing:** Stripe subscriptions. Usage limits reset weekly on paid plans and monthly on the free plan.
- **Hosting:** a home server for now, running everything with Docker Compose (server, worker, Postgres) plus Incus for user VMs. Keep everything configured by environment variables and avoid host-specific assumptions so it can move to AWS or another provider later.
- **Push notifications:** Expo Notifications (mobile), Web Push (web), Tauri notification plugin (desktop).

## Planned repository layout

```
apps/
  client/      Expo app: iOS, Android, web
  desktop/     Tauri 2 shell that loads the client web build
  server/      Hono HTTP/RPC API, auth, realtime streaming
  worker/      24/7 agent runner: consumes jobs, runs the agent loop
packages/
  shared/      Zod schemas, types, constants shared by everything
  api-client/  Typed client for the server API (used by all apps)
  ui/          Cross-platform React Native components
  db/          Drizzle schema, migrations, DB helpers (server/worker only)
  agent/       Agent definition: prompts, tools, Claude SDK wiring
  vm/          VmProvider interface + implementations (Incus first, cloud later)
  billing/     Plans, usage metering, weekly/monthly limit resets, Stripe
brand/         Logo and brand assets (outlined SVGs; source for app icons)
```

Rule of thumb: if two apps need the same logic, it belongs in a package, not copied into each app. Platform-specific code uses `.web.tsx` / `.native.tsx` / `.ios.tsx` / `.android.tsx` file suffixes or lives in `apps/desktop`.

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

## Keeping this file current

Always keep `CLAUDE.md` up to date with the project. When you add an app or package, change the stack, add a command, or make an architectural decision, update the relevant section in the same change. Once the monorepo is scaffolded, add a **Commands** section (install, dev, build, test, lint per app).
