export const POSARD_APP_MODE_COOKIE = "posard_app_mode";

export type PosardAppMode =
  | "desktop-browser"
  | "tablet-browser"
  | "phone-browser"
  | "capacitor-android"
  | "capacitor-ios";

export interface MobileRestrictionResult {
  restricted: boolean;
  title: string;
  reason: string;
}

type MobileAppAccessRole = "admin" | "manager" | "cashier";

const appModes: PosardAppMode[] = [
  "desktop-browser",
  "tablet-browser",
  "phone-browser",
  "capacitor-android",
  "capacitor-ios",
];

const allowedMobileAppPathPatterns = [
  "/pos",
  "/pos/customer-display/[terminalId]",
  "/sync",
  "/help",
  "/notifications",
  "/customers",
  "/debts",
  "/accounts/[profileId]",
];

const terminalPrinterPathPattern = "/companies/[companyId]/terminals";

function routeToRegExp(href: string) {
  const pattern = href.replace(/\[.+?\]/g, "[^/]+");
  return new RegExp(`^${pattern}(?:/.*)?$`);
}

function pathnameMatches(pathname: string, pattern: string) {
  return routeToRegExp(pattern).test(pathname);
}

function normalizeSearchParams(search?: string | URLSearchParams | null) {
  if (!search) {
    return new URLSearchParams();
  }

  if (search instanceof URLSearchParams) {
    return search;
  }

  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export function normalizePosardAppMode(value: unknown): PosardAppMode | null {
  if (typeof value !== "string") {
    return null;
  }

  return appModes.includes(value as PosardAppMode)
    ? (value as PosardAppMode)
    : null;
}

export function isRestrictedMobileAppMode(mode: PosardAppMode | null) {
  return mode !== null && mode !== "desktop-browser";
}

export function detectRequestAppMode(input: {
  cookieValue?: string | null;
  queryValue?: string | null;
  userAgent?: string | null;
  secChUaMobile?: string | null;
}): PosardAppMode {
  const queryMode = normalizePosardAppMode(input.queryValue);
  if (queryMode) {
    return queryMode;
  }

  const cookieMode = normalizePosardAppMode(input.cookieValue);
  if (cookieMode) {
    return cookieMode;
  }

  const userAgent = input.userAgent?.toLowerCase() ?? "";
  const secChUaMobile = input.secChUaMobile?.toLowerCase() ?? "";

  if (userAgent.includes("iphone") || userAgent.includes("ipod")) {
    return "phone-browser";
  }

  if (userAgent.includes("ipad")) {
    return "tablet-browser";
  }

  if (userAgent.includes("android")) {
    return userAgent.includes("mobile") || secChUaMobile.includes("?1")
      ? "phone-browser"
      : "tablet-browser";
  }

  return secChUaMobile.includes("?1") ? "phone-browser" : "desktop-browser";
}

export function getClientViewportAppMode(width: number): PosardAppMode {
  if (width < 768) {
    return "phone-browser";
  }

  if (width < 1280) {
    return "tablet-browser";
  }

  return "desktop-browser";
}

export function isMobileAppHrefAllowed(
  href: string | undefined,
  mode: PosardAppMode | null,
  role?: MobileAppAccessRole | null,
) {
  if (!href || !isRestrictedMobileAppMode(mode) || role === "manager") {
    return true;
  }

  const parsed = new URL(href, "https://posard.local");
  const pathname = parsed.pathname;

  if (pathnameMatches(pathname, terminalPrinterPathPattern)) {
    return parsed.searchParams.get("view") === "printer";
  }

  return allowedMobileAppPathPatterns.some((pattern) =>
    pathnameMatches(pathname, pattern),
  );
}

export function getMobileAppRouteRestriction(input: {
  pathname: string;
  search?: string | URLSearchParams | null;
  mode: PosardAppMode | null;
  role?: MobileAppAccessRole | null;
}): MobileRestrictionResult {
  if (!isRestrictedMobileAppMode(input.mode) || input.role === "manager") {
    return { restricted: false, title: "", reason: "" };
  }

  const searchParams = normalizeSearchParams(input.search);

  if (pathnameMatches(input.pathname, terminalPrinterPathPattern)) {
    const allowed = searchParams.get("view") === "printer";
    return {
      restricted: !allowed,
      title: "Use an admin device for terminal management",
      reason:
        "The mobile/tablet app keeps printer setup available, but terminal lists and deep setup screens stay on desktop.",
    };
  }

  const allowed = allowedMobileAppPathPatterns.some((pattern) =>
    pathnameMatches(input.pathname, pattern),
  );

  return {
    restricted: !allowed,
    title: "Use a desktop or admin device for this area",
    reason:
      "The mobile/tablet app is focused on checkout, sync, printer setup, customers, and help so sales stay fast at the counter.",
  };
}
