export type InstallerPlatform = "android" | "web" | "windows";

export interface InstallerDownload {
  platform: InstallerPlatform;
  title: string;
  targetDevices: string;
  status: "available" | "coming-soon";
  version: string;
  buildNumber: string;
  fileName: string;
  fileSize: string;
  checksum: string;
  releaseDate: string;
  minimumVersion: string;
  downloadUrl: string;
  releaseNotes: string[];
  installNotes: string[];
}

function envValue(key: string, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function envList(key: string, fallback: string[]) {
  const value = envValue(key);

  if (!value) {
    return fallback;
  }

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusFor(downloadUrl: string): InstallerDownload["status"] {
  return downloadUrl ? "available" : "coming-soon";
}

export function getInstallerDownloads(): InstallerDownload[] {
  const androidUrl = envValue("POSARD_ANDROID_APK_URL");
  const windowsUrl = envValue("POSARD_WINDOWS_INSTALLER_URL");

  return [
    {
      platform: "android",
      title: "Android app (.apk)",
      targetDevices: "Android phones, Android tablets, and SUNMI Android POS devices",
      status: statusFor(androidUrl),
      version: envValue("POSARD_ANDROID_APK_VERSION", "Not published"),
      buildNumber: envValue("POSARD_ANDROID_APK_BUILD", "Not published"),
      fileName: envValue("POSARD_ANDROID_APK_FILE_NAME", "POSard-Android.apk"),
      fileSize: envValue("POSARD_ANDROID_APK_FILE_SIZE", "Available after release upload"),
      checksum: envValue("POSARD_ANDROID_APK_SHA256", "Available after release upload"),
      releaseDate: envValue("POSARD_ANDROID_APK_RELEASE_DATE", "Available after release upload"),
      minimumVersion: envValue("POSARD_ANDROID_MIN_VERSION", "Android 8.0 or newer"),
      downloadUrl: androidUrl,
      releaseNotes: envList("POSARD_ANDROID_APK_NOTES", [
        "Hosted POSard app shell for Android devices.",
        "Focused checkout, sync, printer setup, customers, debts, and help access in app mode.",
        "SUNMI printer support falls back safely when unsupported.",
      ]),
      installNotes: [
        "Download only on a trusted store device.",
        "If Android asks for permission to install unknown apps, allow it only for the browser you used to download POSard.",
        "After installing, open POSard and sign in with your normal account.",
      ],
    },
    {
      platform: "web",
      title: "Web app / PWA",
      targetDevices: "iPhone, iPad, Android, Windows, Mac, and browser-only users",
      status: "available",
      version: "Live web app",
      buildNumber: "Managed by web deployment",
      fileName: "No installer file",
      fileSize: "No download required",
      checksum: "Served over HTTPS by the website",
      releaseDate: "Updated with the live website",
      minimumVersion: "Modern browser with service worker support",
      downloadUrl: "/auth/login",
      releaseNotes: [
        "Use POSard in the browser or install it from the browser menu.",
        "Best fallback for iPhone, iPad, Windows users without a native installer, and shared admin devices.",
      ],
      installNotes: [
        "Open POSard in the browser.",
        "Use the Install button when it appears, or use the browser menu to add POSard to the home screen.",
        "Use a desktop browser for deep setup, imports, backups, and broad reporting work.",
      ],
    },
    {
      platform: "windows",
      title: "Windows installer (.exe or .msix)",
      targetDevices: "Windows desktop and Windows tablet",
      status: statusFor(windowsUrl),
      version: envValue("POSARD_WINDOWS_INSTALLER_VERSION", "Future track"),
      buildNumber: envValue("POSARD_WINDOWS_INSTALLER_BUILD", "Future track"),
      fileName: envValue("POSARD_WINDOWS_INSTALLER_FILE_NAME", "POSard-Windows.msix"),
      fileSize: envValue("POSARD_WINDOWS_INSTALLER_FILE_SIZE", "Not available yet"),
      checksum: envValue("POSARD_WINDOWS_INSTALLER_SHA256", "Not available yet"),
      releaseDate: envValue("POSARD_WINDOWS_INSTALLER_RELEASE_DATE", "Not available yet"),
      minimumVersion: envValue("POSARD_WINDOWS_MIN_VERSION", "Windows 10 or newer"),
      downloadUrl: windowsUrl,
      releaseNotes: envList("POSARD_WINDOWS_INSTALLER_NOTES", [
        "Windows native packaging is separate from the Android app.",
        "Use the web app until a signed Windows installer is intentionally built.",
      ]),
      installNotes: [
        "Do not use the Android APK on Windows.",
        "Use the web app unless a signed POSard Windows installer is published here.",
      ],
    },
  ];
}

export function getLatestAndroidInstaller() {
  return getInstallerDownloads().find((download) => download.platform === "android");
}
