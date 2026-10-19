# Development setup

What to install to run Droid247 on each platform. Install the **base tools** first, then only the sections for the platforms you want to run.

| You want to run | Sections to follow |
| --- | --- |
| Web | [Base tools](#base-tools) |
| Real sign-in emails (any platform) | [Email sign-in](#email-sign-in) |
| Google sign-in (any platform) | [Google sign-in](#google-sign-in) |
| Desktop | [Base tools](#base-tools), [Desktop (Tauri)](#desktop-tauri) |
| Android emulator | [Base tools](#base-tools), [Android emulator](#android-emulator) |
| iOS simulator | [Base tools](#base-tools), [iOS simulator](#ios-simulator-macos-only) (Mac only) |
| Your own phone | [Base tools](#base-tools), [Real phone](#real-phone-expo-go) |

When you're done, go back to the [README](../README.md#commands) for the run commands.

## Base tools

Needed for everything.

| Tool | Version | Why |
| --- | --- | --- |
| Git | any recent | Clone the repo |
| Node.js | 22 LTS or newer | Runs the server, the build tools and the Expo dev server |
| pnpm | 10 (pinned in `package.json`) | Package manager for the monorepo |
| Docker with Docker Compose | any recent | Runs Postgres for local development |

**macOS** (with [Homebrew](https://brew.sh)):

```bash
brew install git node@22
brew install --cask docker   # Docker Desktop; open it once so it starts
```

**Windows** (PowerShell):

```powershell
winget install Git.Git OpenJS.NodeJS.LTS Docker.DockerDesktop
```

**Linux** (Ubuntu/Debian): install Node 22 from [nodejs.org](https://nodejs.org/en/download) or with [nvm](https://github.com/nvm-sh/nvm), and Docker Engine with the Compose plugin ([docs.docker.com/engine/install](https://docs.docker.com/engine/install/)):

```bash
sudo apt install git
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22
sudo usermod -aG docker $USER   # after installing Docker; log out and in
```

Arch: `sudo pacman -S git nodejs pnpm docker docker-compose`, then `sudo systemctl enable --now docker`.

Then, on every OS, turn on pnpm, install the project and set up the database:

```bash
corepack enable
cd droid247
pnpm install
pnpm db:up        # Postgres in Docker, on host port 5433 so it doesn't clash with a local Postgres
pnpm db:migrate   # creates the tables
```

Check: `node -v` prints v22 or newer, `pnpm -v` prints 10.x, `docker compose ps` shows `postgres` as healthy.

## Email sign-in

Sign-in codes are sent over SMTP. Without SMTP settings, development still works: the code is printed in the server log (the terminal running a `dev:*` command). To get real emails for free with a Gmail account (about 500 emails a day, no domain needed):

1. Turn on [2-Step Verification](https://myaccount.google.com/signinoptions/twosv) for the Google account.
2. Create an [app password](https://myaccount.google.com/apppasswords) (any name, e.g. "Droid247") and copy the 16 characters.
3. Put it in `.env` in the repo root:

   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=you@gmail.com
   SMTP_PASS=abcdefghijklmnop
   EMAIL_FROM=Droid247 <you@gmail.com>
   ```

4. Restart the dev command. If the email doesn't arrive, check the spam folder and the server log (send errors show up there).

Any other SMTP server works the same way (`SMTP_PORT` is 465 by default, use 587 for STARTTLS). Once you own a domain, [Brevo](https://www.brevo.com) (300 emails a day free) or [Resend](https://resend.com) (3,000 a month free) deliver more reliably than a Gmail address; use their SMTP host, user and key in the same variables.

## Google sign-in

Google sign-in needs an OAuth client from Google Cloud, free and done once:

1. Open [Google Cloud console → APIs & Services](https://console.cloud.google.com/apis/credentials) and create (or pick) a project.
2. **OAuth consent screen**: choose **External**, fill in the app name and your email, and add yourself under **Test users** (while the app is in testing mode only test users can sign in).
3. **Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google`
4. Copy the client ID and secret into `.env` in the repo root (copy `.env.example` first if you have no `.env`):

   ```bash
   GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

5. Restart the dev command.

The same client serves every platform, because Google always returns to the **server** (`<BETTER_AUTH_URL>/api/auth/callback/google`), which then hands the session to the app:

| Platform | How it signs in |
| --- | --- |
| Web | Redirects to Google and back to the page |
| Desktop | Opens Google in your default browser; when done the browser opens the app through a `droid247://` link. On Linux and Windows `pnpm dev:desktop` registers the link at startup (your browser may ask to open Droid247). On macOS the link only works from an installed build (`pnpm build:desktop`). |
| iOS simulator, Android emulator | Opens an in-app browser and returns to Expo Go. The Android emulator reaches the server as `localhost` through `adb reverse`, which `pnpm dev:android` sets up. |
| Real phone | See below |

### Google sign-in on a real phone

Google only accepts `localhost` or a public HTTPS address as a redirect target, and the phone can't reach your computer as `localhost`. Either:

- **Android over USB:** connect the phone, run `adb reverse tcp:3000 tcp:3000` and start with `EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm dev:mobile`.
- **Any phone, via a tunnel:** expose port 3000 with an HTTPS tunnel (for example `cloudflared tunnel --url http://localhost:3000`), then set both URLs to it and add `<tunnel URL>/api/auth/callback/google` to the redirect URIs in Google Cloud:

  ```bash
  BETTER_AUTH_URL=https://example.trycloudflare.com EXPO_PUBLIC_API_URL=https://example.trycloudflare.com pnpm dev:mobile
  ```

Email sign-in works on a real phone without any of this.

## Desktop (Tauri)

The desktop app is a [Tauri 2](https://v2.tauri.app) window written in Rust, so you need the Rust compiler and your OS's web view libraries. Full reference: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Rust (all operating systems)

Install with [rustup](https://rustup.rs):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # macOS / Linux
```

On Windows, download and run `rustup-init.exe` from [rustup.rs](https://rustup.rs) (choose the MSVC toolchain).

Check: `cargo --version`.

### Linux system packages

Ubuntu / Debian:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Fedora:

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel libxdo-devel
sudo dnf group install "c-development"
```

Arch: `sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool`

### Windows

- **Microsoft C++ Build Tools**: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and tick **Desktop development with C++**.
- **WebView2**: already included in Windows 10 (1803+) and 11. If missing, install the Evergreen Bootstrapper from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).

### macOS

```bash
xcode-select --install
```

The first `pnpm dev:desktop` compiles about 400 Rust crates and takes a few minutes. Later runs take seconds.

## Android emulator

You run the app in a virtual Android phone (an AVD, Android Virtual Device) that comes with Android Studio.

1. Install **[Android Studio](https://developer.android.com/studio)**. It bundles a JDK (Java 17+), which is all Expo needs.
2. Open Android Studio → **More Actions → SDK Manager** and make sure these are installed:
   - **SDK Platforms:** the latest Android version
   - **SDK Tools:** Android SDK Build-Tools, Android SDK Platform-Tools, Android Emulator
3. Set environment variables so the command line can find the tools.

   macOS / Linux (`~/.zshrc` or `~/.bashrc`):

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
   # export ANDROID_HOME=$HOME/Android/Sdk         # Linux
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```

   Windows: add a user variable `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk` and add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `Path`.

4. Create a virtual device: **More Actions → Virtual Device Manager → Create device**, pick a phone (for example Pixel 8) and a recent system image, then finish.
5. Linux only: the emulator needs hardware acceleration (KVM). Check with `ls /dev/kvm`; if it's missing, enable virtualization (VT-x/AMD-V) in your BIOS. Add yourself to the group: `sudo usermod -aG kvm $USER`, then log out and in.

Check: `adb --version` and `emulator -list-avds` both work. `pnpm dev:android` calls `adb`, so it must be on your `PATH`.

Run it:

```bash
emulator -avd <name-from-list-avds>   # or press ▶ in Device Manager
pnpm dev:android                      # in another terminal
```

The first run installs **Expo Go** on the emulator automatically.

## iOS simulator (macOS only)

Apple only ships the iOS Simulator for macOS, so you can't run it on Linux or Windows. Use the Android emulator or a real phone there instead.

1. Install **Xcode** from the Mac App Store (large download).
2. Open Xcode once, accept the license and let it install components. Then **Xcode → Settings → Components** and install an **iOS** simulator runtime.
3. Point the command-line tools at Xcode:

   ```bash
   sudo xcode-select -s /Applications/Xcode.app
   ```

Check: `xcrun simctl list devices` lists iPhone simulators.

Run it: `pnpm dev:ios`. It boots a simulator and installs Expo Go automatically.

CocoaPods is **not** needed for the current setup (Expo Go). It's only needed later if we make native development builds (`npx expo run:ios`).

## Real phone (Expo Go)

1. Install **Expo Go** from the [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent). It must support Expo SDK 57 (the store version does; the error screen lists "Supported SDKs" if not).
2. Connect the phone to the **same Wi-Fi** as your computer.
3. Run `pnpm dev:mobile` and scan the QR code (Expo Go on Android, the Camera app on iPhone).
4. Allow incoming connections on ports **3000** (API) and **8081** (Expo) in your computer's firewall.

If the app shows Offline, set the API address by hand (find your IP with `ipconfig` on Windows, `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm dev:mobile
```

## Coming later

Not needed yet, listed so you can plan ahead:

- **Docker** for running the server and worker like production (today it only runs Postgres).
- **Incus**: for the per-user agent VMs on the home server.
