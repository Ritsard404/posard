import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  hasPermissionForRoute,
  getFirstAccessibleRoute,
} from "@/lib/access-control-core";

const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/sign-up",
  "/auth/sign-up-success",
];
const authRoutes = ["/auth/login", "/auth/sign-up"];

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

  // ── Get user role from DB ──────────────────────────────────────────────────
  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status, company_id")
      .eq("user_id", user.sub)
      .single();

    // Pending or disabled account
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

    // Account manager with no company (e.g. just signed up) → force to setup page
    if (
      userRole === "manager" &&
      !profile?.company_id &&
      !pathname.startsWith("/setup-company")
    ) {
      return NextResponse.redirect(new URL("/setup-company", request.url));
    }
  }

  // ── Public routes ──────────────────────────────────────────────────────────
  if (publicRoutes.includes(pathname)) {
    if (user) {
      // Logged-in user hitting "/" or auth pages → redirect to their dashboard
      if (pathname === "/" || authRoutes.some((r) => pathname.startsWith(r))) {
        const dest = getFirstAccessibleRoute(userRole);
        if (dest !== pathname) {
          return NextResponse.redirect(new URL(dest, request.url));
        }
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
    if (dest === "/auth/login" || dest === pathname) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    if (dest !== pathname) {
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return supabaseResponse;
}
