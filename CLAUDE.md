# droid247

An AI agent that runs 24/7 in the cloud, so it keeps working even when the user's computer is off.

## Platforms

Planned targets:

- **Web**
- **Desktop:** Linux, Windows, macOS
- **Mobile:** Android, iOS

## Current status

- Skeleton only: the UI is the login flow (email → 6-digit code → name → welcome, plus "Continue with Google"). Auth is **mocked client-side** in `apps/web/src/mockAuth.ts` (code `123456` passes), since the server has no auth endpoints yet. No backend status is shown in the UI; `apps/web/src/useConnection.ts` (`GET /health`) is kept but currently unused. No agent features yet. Mobile is deferred, but the structure is ready for it (see below).
- Theme: light/dark follows the OS setting via `prefers-color-scheme`. There is deliberately no in-app theme toggle.
- Logo: **One Eye Open** (black-and-white droid face, one eye closed, one open) with a custom wordmark. Final logo files are in `brand/logo/` and app icons for every platform are in `brand/icons/`; see `brand/README.md`. Regenerate with `python3 brand/build_brand.py`.
- No fixed roadmap. Direction is being worked out as the project goes, so suggest options rather than assuming a settled plan.

## Stack and layout

pnpm workspace monorepo. Commands and env vars are listed in `README.md`.

- `apps/server`: **Hono on Node** (TypeScript). Dev runs `tsx watch`; prod is a `tsup` bundle in `dist/`, plus a Docker image (`apps/server/Dockerfile`, built from the repo root).
- `apps/web`: **React + Vite**. This is the only UI, shared by web, desktop and (later) mobile. Platform checks belong only in `src/platform.ts`.
- `apps/native`: **Tauri 2** shell around `apps/web`. It's already mobile-ready (`lib.rs` with `mobile_entry_point`, lib crate types), so Android/iOS means `tauri android init` / `tauri ios init`.
- `packages/shared`: the API contract (zod schemas + `API_VERSION`). Server and clients both import it. Bump the `API_VERSION` major only for breaking changes, since clients refuse a different major.
- `packages/client`: the typed API client. All UI networking goes through it, and it takes an injectable `fetch`.

Conventions:
- Internal packages export TS source (`"exports": "./src/index.ts"`), with no build step of their own.
- The backend URL is never same-origin: the UI reads `VITE_API_URL` (fallback `http://localhost:8787`).
- Favicons/app icons are referenced straight from `brand/icons/` (Vite `publicDir`, Tauri `bundle.icon`). Don't copy them.
- UI font is Geist / Geist Mono, self-hosted via `@fontsource/*` (no Google Fonts requests, so desktop works offline).
- Lint/format with Biome, tests with Vitest (`*.test.ts` next to the code), and run `pnpm typecheck` before committing.
- The Tauri bundle identifier is `ai.droid247.app`. Bundle IDs are effectively permanent once an app ships to stores.

## Domain

The planned domain is `droid247.ai`. It has **not** been purchased yet; the plan is to buy it once the project is done. Don't hardcode it anywhere as if it were live.

## Notes for Claude

- Update this file as decisions are made (stack, structure, build/test commands, conventions).
- Dev servers: if you start one for testing, stop it when done. Never stop a server that was already running (it is the user's).
