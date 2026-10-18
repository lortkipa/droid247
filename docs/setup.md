# Development setup

What to install to run Droid247 on each platform. Install the **base tools** first, then only the sections for the platforms you want to run.

| You want to run | Sections to follow |
| --- | --- |
| Web | [Base tools](#base-tools) |
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

**macOS** (with [Homebrew](https://brew.sh)):

```bash
brew install git node@22
```

**Windows** (PowerShell):

```powershell
winget install Git.Git OpenJS.NodeJS.LTS
```

**Linux** (Ubuntu/Debian): install Node 22 from [nodejs.org](https://nodejs.org/en/download) or with [nvm](https://github.com/nvm-sh/nvm):

```bash
sudo apt install git
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22
```

Then, on every OS, turn on pnpm and install the project:

```bash
corepack enable
cd droid247
pnpm install
```

Check: `node -v` prints v22 or newer, `pnpm -v` prints 10.x.

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

Check: `adb --version` and `emulator -list-avds` both work.

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

- **Docker** with Docker Compose: for Postgres and running the server/worker like production.
- **Incus**: for the per-user agent VMs on the home server.
