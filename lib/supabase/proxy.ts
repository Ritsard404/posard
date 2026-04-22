import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getFirstAccessibleRoute,
  hasPermissionForRoute,
  isAuthRoute,
  isPublicRoute,
} from "@/lib/access-control-core";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  if (!hasEnvVars) return supabaseResponse;

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;
  const isPublic = isPublicRoute(pathname);

  // Marketing/legal pages must remain reachable for guests and signed-in users.
  if (isPublic && pathname !== "/" && !isAuthRoute(pathname)) {
    return supabaseResponse;
  }

  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status, company_id")
      .eq("user_id", user.sub)
      .single();

    if (profile?.status === "pending" || profile?.status === "disabled") {
      if (
        pathname === "/auth/login" ||
        pathname === "/auth/sign-up" ||
        pathname === "/auth/sign-up-success"
      ) {
        return supabaseResponse;
      }
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    userRole = profile?.role ?? null;

    if (
      userRole === "manager" &&
      !profile?.company_id &&
      !pathname.startsWith("/setup-company")
    ) {
      return NextResponse.redirect(new URL("/setup-company", request.url));
    }
  }

  if (isPublic) {
    if (user && (pathname === "/" || isAuthRoute(pathname))) {
      const dest = getFirstAccessibleRoute(userRole);
      if (dest !== pathname) {
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (!hasPermissionForRoute(userRole, pathname)) {
    const dest = getFirstAccessibleRoute(userRole);
    if (dest === "/auth/login" || dest === pathname) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    if (dest !== pathname) {
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return supabaseResponse;
}
