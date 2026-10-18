# Droid247

Droid247 is an AI agent that runs 24/7 in the cloud. Users give it tasks from any device, and the agent keeps working on the server even when the user's computer or phone is off. Clients are thin: they create and steer tasks, stream progress, and receive results and notifications.

## Status

Early stage. The repo has no application code yet, only this file and `LICENSE`. The stack and layout below are the agreed plan. Update this file whenever something is built or a decision changes.

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
- **Agent runtime:** long-running worker processes that execute agent tasks independently of any client connection. Uses the Claude API via the Anthropic TypeScript SDK (Claude Agent SDK for the agent loop).
- **Jobs/scheduling:** Postgres-backed queue (pg-boss) for task runs, retries and scheduled/recurring tasks.
- **Database:** PostgreSQL with Drizzle ORM; migrations in `packages/db`.
- **Auth:** Better Auth (works with web, Expo and Tauri).
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
```

Rule of thumb: if two apps need the same logic, it belongs in a package, not copied into each app. Platform-specific code uses `.web.tsx` / `.native.tsx` / `.ios.tsx` / `.android.tsx` file suffixes or lives in `apps/desktop`.

## Architecture notes

- Clients never run the agent. They create tasks through the API; the worker picks them up from the queue and runs them to completion.
- All task state (status, messages, tool calls, results) is persisted in Postgres so any client can reconnect and resume viewing at any time.
- Server and worker scale independently; the worker must tolerate restarts (resume or retry a task from persisted state).

## Conventions

- TypeScript strict mode everywhere; no `any` without a comment explaining why.
- Validate all external input with Zod schemas from `packages/shared`.
- Keep secrets (Anthropic API key, DB URL, auth secrets) in environment variables, never in the repo.

## Keeping this file current

Always keep `CLAUDE.md` up to date with the project. When you add an app or package, change the stack, add a command, or make an architectural decision, update the relevant section in the same change. Once the monorepo is scaffolded, add a **Commands** section (install, dev, build, test, lint per app).
