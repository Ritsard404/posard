import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  hasPermissionForRoute,
  getFirstAccessibleRoute,
} from "@/lib/access-control";

const publicRoutes = ["/", "/auth/login", "/auth/sign-up"];
const authRoutes = ["/auth/login", "/auth/sign-up", "/auth"];

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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  // ── Get user role from DB ──────────────────────────────────────────────────
  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.sub)
      .single();

    // Pending account
    if (profile?.status === "pending") {
      if (!pathname.startsWith("/auth/pending")) {
        return NextResponse.redirect(new URL("/auth/pending", request.url));
      }
      return supabaseResponse;
    }

    // Disabled account
    if (profile?.status === "disabled") {
      if (!pathname.startsWith("/auth/disabled")) {
        return NextResponse.redirect(new URL("/auth/disabled", request.url));
      }
      return supabaseResponse;
    }

    userRole = profile?.role ?? null;
  }

  // ── Public routes ──────────────────────────────────────────────────────────
  if (publicRoutes.includes(pathname)) {
    if (user) {
      // Logged-in user hitting "/" or auth pages → redirect to their dashboard
      if (
        pathname === "/" ||
        authRoutes.some((r) => pathname.startsWith(r))
      ) {
        const dest = getFirstAccessibleRoute(userRole);
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return supabaseResponse;
  }

  // ── Protected routes ───────────────────────────────────────────────────────

  // Not logged in → send to login
  if (!user) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in but no permission → redirect to their first accessible route
  if (!hasPermissionForRoute(userRole, pathname)) {
    const dest = getFirstAccessibleRoute(userRole);
    if (dest === "/auth/login") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return supabaseResponse;
}