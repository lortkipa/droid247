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

- Node 22.12+ and pnpm 11 (`corepack enable` picks up the pinned version)
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

The UI checks `GET /health` on load. It shows whether it reached the backend, plus the server version, API version and latency.

## Configuration

See [`.env.example`](.env.example).

- **Backend:** `PORT` (default 8787), `HOST`, `CORS_ORIGINS`. The default CORS list allows the Vite dev/preview servers and the Tauri webview origins.
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
