# POSard Capacitor Setup

## Selected Strategy

POSard uses the **hosted web app inside Capacitor** strategy.

This repo is not a safe candidate for `output: "export"` because the current app depends on Next.js server features that need a server runtime:

- `proxy.ts` for Supabase session and route protection
- `cookies()` in the Supabase server client
- `app/auth/confirm/route.ts`
- multiple `"use server"` action modules for POS, accounts, products, companies, and reports

The Android app therefore loads the hosted POSard URL inside Capacitor, while Vercel remains the primary web host and backend runtime.

## What Was Added

- Capacitor packages: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
- `capacitor.config.ts` configured for hosted mode
- Android platform support under `android/`
- `src/lib/capacitor/platform.ts` for runtime detection
- `src/lib/capacitor/printer-bridge.ts` for future native receipt printing integration
- Local Android `SunmiPrinter` Capacitor plugin for built-in printer access on supported SUNMI devices

## Hosted URL Configuration

`capacitor.config.ts` resolves the hosted app URL in this order:

1. `CAPACITOR_APP_URL`
2. `NEXT_PUBLIC_APP_URL`
3. `NEXT_PUBLIC_SITE_URL`
4. `https://posard.vercel.app`

Use `CAPACITOR_APP_URL` when you want the Android app to point to a LAN or local development URL without changing the normal Vercel/web configuration.

## Setup Commands

Install dependencies:

```powershell
npm.cmd install
```

Sync Capacitor after dependency or native changes:

```powershell
npm.cmd run cap:sync
```

Open Android Studio:

```powershell
npm.cmd run cap:open:android
```

Build release APK:

```powershell
npm.cmd run android:assemble:release
```

Build release AAB:

```powershell
npm.cmd run android:bundle:release
```

These release scripts now change into `android/` before invoking Gradle. Running `android\\gradlew.bat` from the repo root fails because Gradle cannot find the Android project's `settings.gradle`.

If the Android platform ever needs to be recreated:

```powershell
npm.cmd run cap:add:android
npm.cmd run cap:sync
```

## Local Android Testing

For the production-hosted shell, no extra config is required. The Android app loads the configured hosted URL.

For local or LAN testing:

1. Start the Next.js app so it is reachable from the Android emulator or device.
2. Set a temporary URL before syncing/opening Android Studio.

Example for Android emulator:

```powershell
$env:CAPACITOR_APP_URL = "http://10.0.2.2:3000"
npm.cmd run cap:sync
npm.cmd run cap:open:android
```

Example for a phone on the same Wi-Fi network:

```powershell
$env:CAPACITOR_APP_URL = "http://192.168.1.50:3000"
npm.cmd run cap:sync
npm.cmd run cap:open:android
```

`cleartext` is enabled automatically only for local HTTP URLs so Android dev builds can load them.

## Android Studio Steps

1. Run `npm.cmd run cap:open:android`.
2. Wait for Gradle sync to finish.
3. Choose an emulator or connected Android device.
4. Run the `app` configuration.
5. If you changed `CAPACITOR_APP_URL`, run `npm.cmd run cap:sync` before launching again.

Manual Android Studio tasks you may still need:

- Accept Android SDK or Gradle prompts the first time the project opens
- Install a system image for your emulator if one is missing
- Allow USB debugging on a physical Android device

## Java Requirement

This Android project is on the current Capacitor/Android Gradle Plugin toolchain and needs JDK 21 for release builds.

If your shell still resolves to Java 17, point `JAVA_HOME` at Android Studio's bundled JDK before running Gradle:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

## Vercel Deployment Note

The web app remains the primary deployment target.

- Keep using Vercel for production web hosting
- Keep Next.js server features enabled
- Do not add `output: "export"` to `next.config.ts`
- Do not move Prisma, Supabase auth, route handlers, or server actions into Capacitor

## Hosted Shell Constraint

POSard currently ships as a hosted web shell inside Capacitor because the app depends on live Next.js server behavior.

That means:

- the Android binary is mainly a native wrapper around the deployed POSard web app
- `CAPACITOR_APP_URL` should point at your production deployment for release builds
- local HTTP URLs such as `10.0.2.2` or `192.168.x.x` are for development only
- if you submit this build to Play, review the hosted-shell behavior carefully because this is less standard than bundling local web assets

## Built-in SUNMI Printing Status

`src/lib/capacitor/printer-bridge.ts` is the shared seam for native receipt printing.

Current behavior:

- web/browser printing still uses the existing POSard print services
- receipt printing can prefer a native SUNMI path when running inside Capacitor on Android
- the Android app now includes a local Capacitor plugin that binds to the SUNMI built-in print service
- if the device does not expose the SUNMI printer service, POSard falls back safely to the current browser preview/print flow

Currently implemented in the Android plugin:

- availability check
- printer self-test
- receipt-segment printing using the existing POSard thermal formatter output
- device/printer info query

Still future work:

- barcode, QR, bitmap, and paper-cut operations
- broader device validation across SUNMI hardware variants such as V2, V2s, and V3

## Release Build Preparation

Release signing is handled in the Android project, not in `capacitor.config.ts`.

Supported signing inputs:

- `android/keystore.properties`
- environment variables:
  - `POSARD_UPLOAD_STORE_FILE`
  - `POSARD_UPLOAD_STORE_PASSWORD`
  - `POSARD_UPLOAD_KEY_ALIAS`
  - `POSARD_UPLOAD_KEY_PASSWORD`

Recommended setup:

1. Copy `android/keystore.properties.example` to `android/keystore.properties`
2. Fill in your real keystore path and passwords
3. Sync Capacitor against the production URL:

```powershell
Remove-Item Env:CAPACITOR_APP_URL -ErrorAction SilentlyContinue
npm.cmd run cap:sync
```

4. Build a release bundle:

```powershell
npm.cmd run android:bundle:release
```

The release build now enables:

- code shrinking
- resource shrinking
- optional release signing when keystore values are present

Signed outputs are generated under:

- `android/app/build/outputs/apk/release/`
- `android/app/build/outputs/bundle/release/`

## Known Limitations

- The first Android app version depends on network access to the hosted POSard app
- Built-in SUNMI printing currently targets the official SUNMI print service path and still needs validation on real hardware
- Browser printer transports still depend on the runtime browser/WebView capabilities
- A remote hosted shell is operationally convenient here, but it still depends on the hosted app being available
- Release signing still requires your real keystore and Play Console setup
