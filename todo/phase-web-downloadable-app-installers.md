# Phase: Web Downloadable App Installers

## Goal

Let users download the POSard app directly from the website without asking support for a file.

Primary outcome: the website should offer clear, safe install downloads for the right device type:

- Android phone/tablet: signed APK download or Play Store link when available.
- Windows desktop/tablet: EXE/MSIX installer only if a Windows desktop wrapper is intentionally built.
- Web/PWA fallback: install from browser when a native installer is not available.

## Implementation Status - 2026-07-08

Implemented in the repo:

- Public `/download` page with Android, Web/PWA, and Windows cards.
- Environment-driven installer metadata in `lib/app-downloads.ts`.
- Android APK checksum helper in `scripts/release-android-installer.ps1`.
- Marketing navigation and SEO entry for the download page.
- Capacitor release publishing docs and operator Help Center/user guide updates.
- Local validation produced `android/app/build/outputs/apk/release/app-release.apk` and `android/app/build/outputs/bundle/release/app-release.aab`.
- APK signature verification passed with APK Signature Scheme v2 and v3.
- APK SHA-256 from local validation: `7631810c2879ebc5551f1bd068a2d8be6a6ce0d25603437553a925677a73015c`.

Remaining before this TODO can be deleted:

- Upload the signed APK to controlled HTTPS artifact storage.
- Set production `POSARD_ANDROID_APK_*` metadata variables to the hosted artifact details.
- Verify `/download` in the production deployment.
- Install the hosted APK on a real Android device and confirm login, POS checkout load, and safe printer/scanner fallback.

## Important File-Type Correction

Do not ship an `.exe` as the mobile app installer. Android phones and tablets install APK/AAB-based Android apps, not Windows EXE files.

If the user asks for "mobile EXE", treat the intended product outcome as "download the mobile app directly from the website" and implement the Android APK path first. Keep EXE work as a separate Windows installer track.

## Current Repo Baseline

- Android Capacitor project exists under `android/`.
- Capacitor setup is documented in `docs/capacitor-setup.md`.
- Release scripts already exist in `package.json`:
  - `npm.cmd run cap:sync`
  - `npm.cmd run android:assemble:release`
  - `npm.cmd run android:bundle:release`
- Android release outputs are documented under:
  - `android/app/build/outputs/apk/release/`
  - `android/app/build/outputs/bundle/release/`
- POSard currently uses a hosted web app inside Capacitor.

## Non-Goals

- Do not commit release APK/AAB/EXE binaries directly into git.
- Do not expose unsigned debug APKs as production downloads.
- Do not call an Android APK an EXE in the UI.
- Do not bypass app signing, malware scanning, or version tracking.
- Do not create a second app codebase just to host downloads.
- Do not publish private keystores, passwords, signing configs, or release secrets.

## Phase 1 - Decide Supported Download Targets

### Tasks

- Define the initial supported installer targets:
  - Android APK direct download
  - Android Play Store link placeholder or future link
  - Web/PWA install instructions
  - optional Windows EXE/MSIX future track
- Add a clear device/platform matrix to the tracker implementation plan.
- Confirm whether POSard should support:
  - Android phones
  - Android tablets
  - SUNMI Android POS devices
  - Windows desktop
  - Windows tablet
  - browser-only users
- Decide whether the first website download page is public or protected.
- Prefer public download page for app installers, but never expose admin-only setup details.

### Acceptance Criteria

- The implementation knows which artifact belongs to which platform.
- Android is tracked as APK/AAB, not EXE.
- Windows EXE is marked as optional/future unless a Windows wrapper is added.
- Download UX does not confuse mobile users with desktop installer files.

## Phase 2 - Release Artifact Storage

### Tasks

- Choose a safe artifact host:
  - Vercel Blob or other controlled object storage
  - GitHub Releases if release visibility is acceptable
  - private storage with signed URLs if downloads must be controlled
- Do not store large binaries in `public/` unless there is an explicit deployment-size decision.
- Create a metadata source for release artifacts with:
  - platform
  - version
  - build number
  - file name
  - file size
  - SHA-256 checksum
  - release date
  - minimum supported Android/Windows version
  - direct download URL
  - release notes summary
- Decide whether metadata lives in code, database, CMS, or storage JSON.
- Add cache headers appropriate for versioned immutable files.
- Ensure old versions can remain available or be retired safely.

### Acceptance Criteria

- The website can render installer metadata without hard-coding a stale one-off link.
- Direct download files are versioned and checksum-verifiable.
- Release files are not accidentally bundled into the Next.js app.
- Download links can be updated without risky code edits if possible.

## Phase 3 - Android APK Release Pipeline

### Tasks

- Verify release signing setup from `docs/capacitor-setup.md`.
- Ensure production builds use the correct hosted URL.
- Build release APK with:
  - `npm.cmd run cap:sync`
  - `npm.cmd run android:assemble:release`
- Build AAB for Play Store readiness with:
  - `npm.cmd run android:bundle:release`
- Add or document checksum generation for the APK.
- Add a release checklist that verifies:
  - signed release APK
  - correct package name
  - correct app name
  - production URL
  - no local development URL
  - app opens on a real Android device
  - POS login works
  - POS checkout loads
  - printer/scanner behavior degrades safely if unsupported
- Document manual upload steps or automate upload to the chosen artifact host.

### Acceptance Criteria

- A signed release APK can be produced repeatably.
- The release APK is uploaded to the configured artifact host.
- The website download metadata points to the uploaded signed APK.
- A checksum is shown or available for verification.
- Debug APKs are not exposed as production downloads.

## Phase 4 - Website Download Page

### Tasks

- Reuse the existing marketing/public app structure before creating new layout patterns.
- Add a download page such as `/download` or `/app-download`.
- Add device-aware download cards:
  - Android app
  - Web install
  - Windows installer if implemented later
- Show:
  - platform
  - version
  - release date
  - file size
  - checksum or "verify download" detail
  - install notes
- Add a primary Android download button that points to the latest signed APK.
- Add a secondary browser/PWA install path.
- If a user is on iOS, show browser/PWA guidance rather than an APK button as the primary action.
- If a user is on Windows, show Windows installer only when it exists; otherwise show web app guidance.
- Add safe copy:
  - "Android app (.apk)"
  - "Windows installer (.exe or .msix)"
  - never "mobile exe"
- Add a release notes section for latest version changes.

### Acceptance Criteria

- Users can reach a clear download page from the website.
- Android users see the Android APK as the correct download.
- Windows users are not offered an Android APK as the primary install option.
- iOS users are guided to the web/PWA option.
- The page handles missing artifact metadata gracefully.

## Phase 5 - Optional Windows EXE/MSIX Track

### Tasks

- Decide whether POSard needs a real Windows desktop/tablet installer.
- If yes, create a separate architecture decision before implementation:
  - Tauri wrapper
  - Electron wrapper
  - PWA-only shortcut
  - other desktop packaging option
- Confirm app behavior requirements for Windows:
  - hosted web shell
  - offline/PWA mode
  - printer integrations
  - barcode scanner integrations
  - auto-update behavior
- Add release signing requirements for Windows installers.
- Add build scripts only after choosing the wrapper strategy.
- Keep Windows release artifacts separate from Android release artifacts.

### Acceptance Criteria

- EXE/MSIX is only offered if a Windows installer is actually built and signed.
- Windows installer docs do not confuse Android mobile users.
- The download page can show Windows as "coming soon" or web-only until implemented.

## Phase 6 - Security, Trust, And Abuse Controls

### Tasks

- Ensure all installer downloads are served over HTTPS.
- Add checksum generation and display.
- Add clear release versioning.
- Avoid exposing keystore files or signing secrets.
- Add basic download logging only if it respects privacy and app policy.
- Consider rate limiting or abuse protection if files are served through app routes.
- Validate MIME types and content disposition for downloads.
- If using signed URLs, set reasonable expiration and refresh behavior.

### Acceptance Criteria

- Users can verify they downloaded the intended installer.
- Release secrets are not present in the repo or website bundle.
- Download endpoints do not expose local file paths or storage internals.
- Production installer downloads are not mixed with debug/testing artifacts.

## Phase 7 - Docs And Help Center

### Tasks

- Update `docs/capacitor-setup.md` with the final release/download flow.
- Create or update a user guide page for installing POSard from the website.
- Link the guide from `docs/user-guide/user-guide-index.md`.
- Add a Help Center entry if authenticated users need install guidance.
- Add release/admin notes for:
  - creating Android releases
  - uploading artifacts
  - updating metadata
  - retiring old downloads

### Acceptance Criteria

- Operators know how to install the app from the website.
- Admins know which file to download for Android vs Windows.
- Developers know how to produce and publish the release artifact.
- Help Center search can find "download app", "APK", "Android", and "install".

## Phase 8 - Validation And Deletion Criteria

### Required Validation

- `npx.cmd prisma validate`
- `npx.cmd tsc --noEmit`
- Targeted ESLint for changed files
- `npm.cmd run build`
- `npm.cmd run cap:sync`
- `npm.cmd run android:assemble:release`
- Verify generated APK exists under `android/app/build/outputs/apk/release/`
- Generate and record APK checksum
- Manual or automated browser check for the download page
- Manual Android device install/open check for the signed APK when release credentials are available

### Delete This TODO Only When

- Website download page is implemented.
- Android APK release artifact is hosted safely.
- Download metadata is versioned and visible.
- The UI correctly says APK for Android and EXE/MSIX only for Windows.
- Docs and Help Center entries are updated.
- Release validation commands pass or blocked release-signing requirements are documented.
- No binaries, signing keys, passwords, or debug installers were committed to git.

## Suggested Implementation Order

1. Phase 1 - supported download targets
2. Phase 2 - artifact storage and metadata
3. Phase 3 - Android APK release pipeline
4. Phase 4 - website download page
5. Phase 6 - security and trust controls
6. Phase 7 - docs/help
7. Phase 5 - optional Windows installer track
8. Phase 8 - validation and delete tracker
