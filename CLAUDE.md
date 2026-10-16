# droid247

An AI agent that runs 24/7 in the cloud, so it keeps working even when the user's computer is off.

## Platforms

Planned targets:

- **Web**
- **Desktop:** Linux, Windows, macOS
- **Mobile:** Android, iOS

## Current status

- Auth is real: email → 6-digit code (10 min, burned by any attempt) → name (new accounts only). Server side is `apps/server/src/auth.ts` + `db.ts` (SQLite via `node:sqlite`, schema changes go in its `MIGRATIONS` list) + `mailer.ts` (SMTP via nodemailer; codes go to the server console when `SMTP_HOST` is unset). Sessions are opaque bearer tokens stored hashed; the UI keeps the token in `localStorage` (`apps/web/src/api.ts`).
- Google sign-in is a server-side OAuth code flow with PKCE (`apps/server/src/google.ts`, needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`). The UI (`apps/web/src/google.ts`) passes a nonce that `POST /auth/google/finish` checks. Web uses a full-page redirect. Desktop opens the system browser and catches the redirect on a fixed 127.0.0.1 port (`tauri-plugin-oauth`, desktop only); the page left in the browser opens `droid247://open` to bring the app back. That scheme (`tauri-plugin-deep-link`) only brings the window forward and must never carry data; the ticket travels over the loopback only. Focus handoff lives in `apps/native/src-tauri/src/activation.rs`: on Linux the browser is launched through GIO so it gets an xdg-activation token, and the desktop app is single-instance via a Unix socket that forwards the launcher's token to the running window (the single-instance plugin would drop it); Windows uses `tauri-plugin-single-instance`, macOS activates on deep links itself. Known gap: Chromium on Wayland doesn't attach a token when a page opens `droid247://` (checked on GNOME with Chromium 153), so GNOME only shows a "droid247 is ready" notice; Firefox does pass one. New Google accounts get the Google name prefilled but editable.
- Accounts are matched by email, and the creating method owns the name and avatar: Google accounts get the Google photo (`users.avatar_url`), email accounts get the default silhouette (`apps/web/src/Avatar.tsx`). Signing in with the other method links it (`users.google_sub`) but never changes name or avatar.
- After sign-in the UI shows `apps/web/src/Account.tsx`: a deliberately unstyled test page (avatar, name, email, Log out, Delete account) that will be replaced.
- No backend status is shown in the UI; `apps/web/src/useConnection.ts` (`GET /health`) is kept but currently unused. No agent features yet. Mobile is deferred, but the structure is ready for it (see below).
- Desktop title bar: Linux and Windows windows have no decorations (`decorations: false`); `apps/web/src/TitleBar.tsx` draws an invisible drag strip (`data-tauri-drag-region`, double-click maximizes) with minimize / maximize-restore / close buttons top-right. macOS keeps native traffic lights over the page via `tauri.macos.conf.json` (`titleBarStyle: "Overlay"`; Tauri replaces the `windows` array whole, so it repeats the full window entry). Linux gets a hairline edge instead of a shadow, hidden while maximized. The window calls need the `core:window:*` permissions in `capabilities/default.json`. `main.tsx` sets `data-os` / `data-titlebar` on `<html>` for the CSS.
- Theme: light/dark follows the OS setting via `prefers-color-scheme`. There is deliberately no in-app theme toggle.
- Logo: **One Eye Open** (black-and-white droid face, one eye closed, one open) with a custom wordmark. Final logo files are in `brand/logo/` and app icons for every platform are in `brand/icons/`; see `brand/README.md`. Regenerate with `python3 brand/build_brand.py`.
- No fixed roadmap. Direction is being worked out as the project goes, so suggest options rather than assuming a settled plan.

## Stack and layout

pnpm workspace monorepo. Commands and env vars are listed in `README.md`.

- `apps/server`: **Hono on Node** (TypeScript). Dev runs `tsx watch`; prod is a `tsup` bundle in `dist/`, plus a Docker image (`apps/server/Dockerfile`, built from the repo root). Server env lives in the root `.env` (see `.env.example`). Node 22.13+ for `node:sqlite`; tsup keeps the `node:` prefix (`removeNodeProtocol: false`) because `sqlite` has no bare name.
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
