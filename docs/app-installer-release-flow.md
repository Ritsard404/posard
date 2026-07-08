# POSard App Installer Release Flow

## Purpose

Use this checklist when publishing POSard installers from the website.

## Supported targets

| Device type | Installer path | Status |
| --- | --- | --- |
| Android phone | Signed APK direct download | Supported when `POSARD_ANDROID_APK_URL` is configured |
| Android tablet | Signed APK direct download | Supported when `POSARD_ANDROID_APK_URL` is configured |
| SUNMI Android POS | Signed APK direct download | Supported when `POSARD_ANDROID_APK_URL` is configured |
| iPhone or iPad | Web app / PWA | Supported |
| Windows desktop or tablet | EXE/MSIX | Future track unless `POSARD_WINDOWS_INSTALLER_URL` is configured |
| Browser-only users | Web app / PWA | Supported |

## Artifact storage rules

- Store APK, AAB, EXE, and MSIX files outside git.
- Use HTTPS object storage or release hosting.
- Use versioned immutable artifact file names.
- Keep signed release artifacts separate from debug builds.
- Keep keystores, passwords, and signing configuration out of public bundles.

## Android publishing steps

1. Confirm release signing is configured through `android/keystore.properties` or `POSARD_UPLOAD_*` environment variables.
2. Remove development `CAPACITOR_APP_URL` values.
3. Run `npm.cmd run cap:sync`.
4. Run `npm.cmd run android:assemble:release`.
5. Run `npm.cmd run android:bundle:release` when preparing Play Store readiness.
6. Confirm the APK exists under `android/app/build/outputs/apk/release/`.
7. Generate metadata:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/release-android-installer.ps1 -ApkPath "android/app/build/outputs/apk/release/app-release.apk" -Version "1.0.0" -BuildNumber "1"
   ```

8. Upload the signed APK to the artifact host.
9. Set the `POSARD_ANDROID_APK_*` environment variables for the website.
10. Open `/download` and verify the public metadata.
11. Install the APK on a trusted Android device.
12. Confirm login, POS checkout load, Sync Center access, and safe printer/scanner fallback behavior.

## Retiring releases

- Keep old versions available only while they are still supported.
- Remove the direct URL from the website metadata before deleting or restricting an artifact.
- Keep the release date, version, and checksum in release notes or storage records.
