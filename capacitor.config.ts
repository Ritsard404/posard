import type { CapacitorConfig } from "@capacitor/cli";

const DEFAULT_HOSTED_URL = "https://posard.vercel.app";

function getHostedAppUrl() {
  return (
    process.env.CAPACITOR_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    DEFAULT_HOSTED_URL
  );
}

function isLocalAndroidDevUrl(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isPrivateIp =
      host === "10.0.2.2" ||
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./u.test(host);

    return parsed.protocol === "http:" && isPrivateIp;
  } catch {
    return false;
  }
}

function getAllowedHosts(value: string) {
  try {
    return [new URL(value).hostname];
  } catch {
    return [];
  }
}

function getAndroidScheme(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" ? "https" : "http";
  } catch {
    return "http";
  }
}

const hostedAppUrl = getHostedAppUrl();

const config: CapacitorConfig = {
  appId: "com.posard.app",
  appName: "POSard",
  webDir: "public",
  server: {
    url: hostedAppUrl,
    cleartext: isLocalAndroidDevUrl(hostedAppUrl),
    androidScheme: getAndroidScheme(hostedAppUrl),
    allowNavigation: getAllowedHosts(hostedAppUrl),
  },
};

export default config;
