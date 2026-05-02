const DEFAULT_PUBLIC_APP_URL = "https://posard.vercel.app";

function cleanUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/$/, "");
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getPublicAppUrl() {
  const candidates = [
    cleanUrl(process.env.NEXT_PUBLIC_APP_URL),
    cleanUrl(process.env.NEXT_PUBLIC_SITE_URL),
    DEFAULT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));

  return (
    candidates.find((value) => !isLocalUrl(value)) ?? DEFAULT_PUBLIC_APP_URL
  );
}

export function getAuthRedirectUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}${normalizedPath}`;
}
