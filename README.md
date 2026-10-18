# Droid247

An AI agent that runs 24/7 in the cloud. This repository is the monorepo for the server and every client (web, desktop, Android, iOS).

Right now it holds a **skeleton**: a small API server and an app with a mock login that connects to it and shows whether the backend is online. The same app runs in the browser, as a desktop app and on phones.

## What's in the repo

| Path | What it is |
| --- | --- |
| `apps/server` | API server (Node.js, Hono, oRPC). Serves `GET /health` and the typed RPC API at `/rpc`. |
| `apps/client` | The app (Expo + React Native). One codebase for web, Android and iOS. |
| `apps/desktop` | Desktop app (Tauri 2). A native window that loads the client's web build. |
| `packages/shared` | Zod schemas, the API contract and constants used by everything. |
| `packages/api-client` | Typed client for the server API. |
| `brand/logo` | Logo kit. App icons are copied from here. |

## What you need to install

Short version below. Step-by-step instructions for each operating system are in [docs/setup.md](docs/setup.md).

| To run on | Install |
| --- | --- |
| **Everything** | Git, Node.js 22 LTS or newer, pnpm 10 (`corepack enable`) |
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
pnpm dev:web           # starts the server and opens the app in your browser
```

The app opens on a **mock login** (nothing is checked against a real account yet):

- **Continue with Email:** enter any valid address, then the code **`123456`**. A wrong code fails for good; use "Continue with a different Email" to start over.
- **Continue with Google:** signs in as a sample Google account, no real Google sign-in.

After you enter a name you land on the home screen. It shows your profile and the backend status: **Online** with the server's version and uptime. Stop the server (Ctrl+C) and it switches to **Offline** within 5 seconds. The session lives only in memory, so refreshing or restarting the app signs you out.

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

### Start an Android emulator

Either open Android Studio → **Device Manager** → ▶ next to a device, or from a terminal:

```bash
emulator -list-avds          # shows your virtual devices, e.g. Pixel_8_API_35
emulator -avd Pixel_8_API_35 # starts it; leave this terminal open
pnpm dev:android             # in a second terminal
```

### Build and check

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | Type-checks every package |
| `pnpm build` | Builds the server (`apps/server/dist`) and the web app (`apps/client/dist`) |
| `pnpm build:desktop` | Builds desktop installers for the current OS (`apps/desktop/src-tauri/target/release/bundle`) |
| `pnpm --filter @droid247/server start` | Runs the built server |

## Configuration

Copy `.env.example` to `.env` to change defaults. Nothing is required for local development.

| Variable | Default | Used by |
| --- | --- | --- |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server bind address (all interfaces, so emulators and phones can reach it) |
| `CORS_ORIGIN` | `*` | Allowed browser origins, comma-separated |
| `EXPO_PUBLIC_API_URL` | auto | Server URL the app calls. Leave it empty to use the automatic choice below. |

How the app finds the server when `EXPO_PUBLIC_API_URL` is empty:

| Running on | Server URL |
| --- | --- |
| Web, desktop | `http://localhost:3000` |
| Real phone or emulator via Expo Go | The computer running the Expo dev server, on port 3000 |
| Android emulator (fallback) | `http://10.0.2.2:3000` (the emulator's address for your computer) |
| iOS simulator (fallback) | `http://localhost:3000` |

## Troubleshooting

- **Phone shows Offline.** The phone must be on the same Wi-Fi as your computer, and your firewall must allow incoming connections on ports 3000 and 8081. If it still fails, set the URL by hand: `EXPO_PUBLIC_API_URL=http://<your computer's IP>:3000 pnpm dev:mobile`.
- **Expo Go says the project is incompatible.** Each Expo Go release supports only one Expo SDK version. This project uses **SDK 57**, the version the store builds of Expo Go support. Update Expo Go from the store; if it still doesn't match, check the "Supported SDKs" line in the error against `expo` in `apps/client/package.json`.
- **`pnpm dev:android` can't find a device.** Start the emulator first and check `adb devices` lists it.
- **Desktop build fails on Linux with missing `webkit2gtk`.** Install Tauri's system packages, see [docs/setup.md](docs/setup.md#desktop-tauri).
- **Port already in use.** Another copy is still running. Stop it, or change `PORT`.
