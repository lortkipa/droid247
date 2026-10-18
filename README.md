# Droid247

An AI agent that runs 24/7 in the cloud. This repository is the monorepo for the server and every client (web, desktop, Android, iOS).

Right now it holds a **skeleton**: a small API server with real accounts (Google sign-in and email codes) and an app that signs in and shows whether the backend is online. The same app runs in the browser, as a desktop app and on phones.

## What's in the repo

| Path | What it is |
| --- | --- |
| `apps/server` | API server (Node.js, Hono, oRPC, Better Auth). Serves `GET /health`, sign-in at `/api/auth` and the typed RPC API at `/rpc`. |
| `apps/client` | The app (Expo + React Native). One codebase for web, Android and iOS. |
| `apps/desktop` | Desktop app (Tauri 2). A native window that loads the client's web build. |
| `packages/shared` | Zod schemas, the API contract and constants used by everything. |
| `packages/api-client` | Typed client for the server API. |
| `packages/db` | Database schema and migrations (Drizzle, Postgres). |
| `brand/logo` | Logo kit. App icons are copied from here. |

## What you need to install

Short version below. Step-by-step instructions for each operating system are in [docs/setup.md](docs/setup.md).

| To run on | Install |
| --- | --- |
| **Everything** | Git, Node.js 22 LTS or newer, pnpm 10 (`corepack enable`), Docker with Docker Compose (runs Postgres) |
| **Web** | Nothing else. Any modern browser. |
| **Desktop** | Rust (via rustup) and Tauri's system packages: WebKitGTK on Linux, Microsoft C++ Build Tools + WebView2 on Windows, Xcode Command Line Tools on macOS |
| **Android emulator** | Android Studio (Android SDK, platform-tools, an emulator image), JDK 17 |
| **iOS simulator** | A Mac with Xcode (includes the iOS Simulator). iOS can't be run from Linux or Windows. |
| **Real phone (optional)** | The **Expo Go** app from the App Store / Google Play, phone on the same Wi-Fi as your computer |

## Quick start

```bash
git clone https://github.com/lortkipa/droid247.git
cd droid247
corepack enable        # makes the right pnpm version available
pnpm install           # installs everything for all apps
pnpm db:up             # starts Postgres in Docker (port 5433)
pnpm db:migrate        # creates the tables
pnpm dev:web           # starts the server and opens the app in your browser
```

The app opens on the login screen:

- **Continue with Email:** enter any valid address, then the code **`123456`**. Emails aren't sent yet, so the code is always this one (the server log prints it too). A wrong code fails for good; use "Continue with a different Email" to start over.
- **Continue with Google:** real Google sign-in. It needs a Google OAuth client in `.env` first, see [Google sign-in](docs/setup.md#google-sign-in). Without one the button says Google sign-in isn't set up.

Google and Email with the same address are **the same account**. A new account asks for your name once (pre-filled with your Google name, and your Google photo becomes the profile photo). After that the name and photo stay as they are, whichever way you sign in. Then you land on the home screen: your profile, the backend status (**Online** with the server's version and uptime, **Offline** within 5 seconds of stopping the server), **Log out** and **Delete account**. You stay signed in across reloads and restarts.

## Commands

Run all commands from the repository root. Every `dev:*` command starts the API server too, so you only need one terminal. Press Ctrl+C to stop.

### Open the app

| Platform | Command | What happens |
| --- | --- | --- |
| Web | `pnpm dev:web` | Opens http://localhost:8081 in your browser |
| Desktop (Linux, Windows, macOS) | `pnpm dev:desktop` | Compiles the Tauri shell (slow the first time) and opens a Droid247 window |
| Android emulator | `pnpm dev:android` | Opens the app in Expo Go on the running emulator (start the emulator first, see below) |
| iOS simulator (macOS only) | `pnpm dev:ios` | Boots the iOS Simulator and opens the app in Expo Go |
| Real phone | `pnpm dev:mobile` | Prints a QR code; scan it with Expo Go (Android) or the Camera app (iPhone) |
| Server only | `pnpm dev:server` | API on http://localhost:3000 (try `curl localhost:3000/health`) |

The server needs Postgres running (`pnpm db:up`) with the tables created (`pnpm db:migrate`).

### Start an Android emulator

Either open Android Studio → **Device Manager** → ▶ next to a device, or from a terminal:

```bash
emulator -list-avds          # shows your virtual devices, e.g. Pixel_8_API_35
emulator -avd Pixel_8_API_35 # starts it; leave this terminal open
pnpm dev:android             # in a second terminal
```

### Database

| Command | What it does |
| --- | --- |
| `pnpm db:up` | Starts Postgres in Docker (`docker-compose.yml`, host port 5433, data kept in a volume) |
| `pnpm db:migrate` | Applies migrations from `packages/db/drizzle` |
| `pnpm db:generate` | Writes a new migration after you change `packages/db/src/schema.ts` |
| `docker compose down` | Stops Postgres (add `-v` to delete all data) |

### Build and check

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | Type-checks every package |
| `pnpm build` | Builds the server (`apps/server/dist`) and the web app (`apps/client/dist`) |
| `pnpm build:desktop` | Builds desktop installers for the current OS (`apps/desktop/src-tauri/target/release/bundle`) |
| `pnpm --filter @droid247/server start` | Runs the built server |

## Configuration

Copy `.env.example` to `.env` in the repo root to change defaults. Only Google sign-in needs setting up for local development; everything else has a working default.

| Variable | Default | Used by |
| --- | --- | --- |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server bind address (all interfaces, so emulators and phones can reach it) |
| `CORS_ORIGIN` | `http://localhost:8081,tauri://localhost,http://tauri.localhost` | Web and desktop app origins, comma-separated. Allowed to call the API with credentials and trusted as sign-in redirect targets. |
| `DATABASE_URL` | the `pnpm db:up` container | Postgres connection URL. Required in production. |
| `BETTER_AUTH_SECRET` | a dev-only value | Signs sessions and cookies. Required in production (32+ random characters). |
| `BETTER_AUTH_URL` | `http://localhost:<PORT>` | Public URL of the server; Google redirects to `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | none | Google sign-in, see [docs/setup.md](docs/setup.md#google-sign-in) |
| `EXPO_PUBLIC_API_URL` | auto | Server URL the app calls. Leave it empty to use the automatic choice below. |

How the app finds the server when `EXPO_PUBLIC_API_URL` is empty:

| Running on | Server URL |
| --- | --- |
| Web, desktop | `http://localhost:3000` |
| iOS simulator | `http://localhost:3000` |
| Android emulator | `http://localhost:3000`, forwarded to your computer by `adb reverse tcp:3000 tcp:3000` (`pnpm dev:android` runs it) |
| Real phone via Expo Go | The computer running the Expo dev server, on port 3000 |

Simulators and emulators use `localhost` so that Google sign-in comes back to the same address it started from. On a real phone, Google sign-in needs a public HTTPS address for the server, see [docs/setup.md](docs/setup.md#google-sign-in-on-a-real-phone).

## Troubleshooting

- **Server fails with `ECONNREFUSED` on port 5433, or "relation "user" does not exist".** Postgres isn't running or has no tables: `pnpm db:up && pnpm db:migrate`.
- **Google button says "Google sign-in isn't set up on the server".** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env` and restart, see [docs/setup.md](docs/setup.md#google-sign-in).
- **Google shows `redirect_uri_mismatch`.** The redirect URI in Google Cloud must be exactly `<BETTER_AUTH_URL>/api/auth/callback/google` (default `http://localhost:3000/api/auth/callback/google`).
- **Desktop: Google sign-in finishes in the browser but the app doesn't notice.** The `droid247://` link isn't registered. On Linux and Windows `pnpm dev:desktop` registers it at startup; on macOS it only works from an installed build (`pnpm build:desktop`).
- **Android emulator shows Offline.** Start the emulator before `pnpm dev:android` (it runs `adb reverse`). If the emulator restarted, run `adb reverse tcp:3000 tcp:3000` again.
- **Phone shows Offline.** The phone must be on the same Wi-Fi as your computer, and your firewall must allow incoming connections on ports 3000 and 8081. If it still fails, set the URL by hand: `EXPO_PUBLIC_API_URL=http://<your computer's IP>:3000 pnpm dev:mobile`.
- **Expo Go says the project is incompatible.** Each Expo Go release supports only one Expo SDK version. This project uses **SDK 57**, the version the store builds of Expo Go support. Update Expo Go from the store; if it still doesn't match, check the "Supported SDKs" line in the error against `expo` in `apps/client/package.json`.
- **`pnpm dev:android` can't find a device.** Start the emulator first and check `adb devices` lists it.
- **Desktop build fails on Linux with missing `webkit2gtk`.** Install Tauri's system packages, see [docs/setup.md](docs/setup.md#desktop-tauri).
- **Port already in use.** Another copy is still running. Stop it, or change `PORT`.
