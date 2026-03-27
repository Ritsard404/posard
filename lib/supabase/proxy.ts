import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  routePermissions,
  getPermissionsForRole,
  type Permission,
} from "@/lib/permissions";

// Build route map from permissions config
const routePermissionMap: Record<string, Permission[]> = routePermissions.reduce(
  (acc, route) => {
    acc[route.path] = route.requiredPermissions;
    return acc;
  },
  {} as Record<string, Permission[]>,
);

const publicRoutes = ["/", "/auth/login", "/auth/sign-up"];
const authRoutes = ["/auth/login", "/auth/sign-up", "/auth"];
const dashboardRoutes = Object.keys(routePermissionMap);

/**
 * Check if user has permission for a route
 */
function hasPermissionForRoute(
  userPermissions: Permission[],
  pathname: string,
): boolean {
  // Find matching route (check exact match first, then prefix match)
  let requiredPermissions: Permission[] | undefined;

  for (const route of dashboardRoutes) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      requiredPermissions = routePermissionMap[route];
      break;
    }
  }

  if (!requiredPermissions || requiredPermissions.length === 0) return true; // Allow if no specific permissions required

  // Check if user has any of the required permissions
  return requiredPermissions.some((perm: Permission) =>
    userPermissions.includes(perm),
  );
}

/**
 * Get first accessible route based on permissions
 */
function getAccessibleRoute(userPermissions: Permission[]): string {
  for (const route of dashboardRoutes) {
    const requiredPermissions = routePermissionMap[route];
    if (
      requiredPermissions &&
      requiredPermissions.some((perm: Permission) =>
        userPermissions.includes(perm),
      )
    ) {
      return route;
    }
  }
  return "/auth/login"; // Fallback to login
}

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

  // Get user role and permissions from database
  let userPermissions: Permission[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user.sub)
      .single();

    // Handle status checks
    if (profile?.status === "pending") {
      if (!pathname.startsWith("/auth/pending")) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/pending";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (profile?.status === "disabled") {
      if (!pathname.startsWith("/auth/disabled")) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/disabled";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Get permissions for user's role
    userPermissions = getPermissionsForRole(profile?.role || null);
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    // Redirect logged-in users from root to their first accessible route
    if (pathname === "/" && user) {
      const accessibleRoute = getAccessibleRoute(userPermissions);
      const url = request.nextUrl.clone();
      url.pathname = accessibleRoute;
      return NextResponse.redirect(url);
    }

    // Redirect to dashboard if already logged in and trying to access auth routes
    if (authRoutes.some((route) => pathname.startsWith(route)) && user) {
      const accessibleRoute = getAccessibleRoute(userPermissions);
      const url = request.nextUrl.clone();
      url.pathname = accessibleRoute;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // Protect dashboard routes
  if (
    dashboardRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    )
  ) {
    // Redirect to login if not authenticated
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    // Check permissions
    if (!hasPermissionForRoute(userPermissions, pathname)) {
      // Redirect to unauthorized or first accessible route
      const accessibleRoute = getAccessibleRoute(userPermissions);
      if (accessibleRoute === "/auth/login") {
        // No accessible routes
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
      const url = request.nextUrl.clone();
      url.pathname = accessibleRoute;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}
