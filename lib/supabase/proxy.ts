import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthRoute,
  isPublicRoute,
} from "@/lib/access-control-core";
import {
  detectRequestAppMode,
  POSARD_APP_MODE_COOKIE,
} from "@/lib/mobile-app-mode";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  const startedAt = performance.now();
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  const appMode = detectRequestAppMode({
    cookieValue: request.cookies.get(POSARD_APP_MODE_COOKIE)?.value,
    queryValue:
      request.nextUrl.searchParams.get("posardAppMode") ??
      request.nextUrl.searchParams.get("appMode"),
    userAgent: requestHeaders.get("user-agent"),
    secChUaMobile: requestHeaders.get("sec-ch-ua-mobile"),
  });
  const correlationId =
    requestHeaders.get("x-posard-correlation-id") ||
    requestHeaders.get("x-request-id") ||
    randomUUID();
  requestHeaders.set("x-posard-pathname", pathname);
  requestHeaders.set("x-posard-search", request.nextUrl.search);
  requestHeaders.set("x-posard-app-mode", appMode);
  requestHeaders.set("x-posard-correlation-id", correlationId);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (!hasEnvVars) return supabaseResponse;
  supabaseResponse.headers.set("x-posard-correlation-id", correlationId);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const isPublic = isPublicRoute(pathname);

  const logAuthTiming = (reason: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("POSard proxy auth timing", {
        pathname,
        correlationId,
        reason,
        ms: Math.round(performance.now() - startedAt),
      });
    }
  };

  // Marketing/legal pages must remain reachable without profile/business queries.
  if (isPublic && pathname !== "/" && !isAuthRoute(pathname)) {
    logAuthTiming("public");
    return supabaseResponse;
  }

  if (pathname === "/auth/logout") {
    logAuthTiming("logout");
    return supabaseResponse;
  }

  if (isPublic) {
    if (user && (pathname === "/" || isAuthRoute(pathname))) {
      logAuthTiming("auth-user-to-dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    logAuthTiming("public");
    return supabaseResponse;
  }

  if (!user) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    logAuthTiming("missing-session");
    return NextResponse.redirect(url);
  }

  logAuthTiming("session-ok");
  return supabaseResponse;
}
