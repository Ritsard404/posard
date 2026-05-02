/**
 * Lightweight access-control primitives for server/proxy code.
 * Keep icon-heavy sidebar config out of request-critical modules.
 */

export type UserRole = "admin" | "manager" | "cashier";

export const roles: UserRole[] = ["admin", "manager", "cashier"];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && roles.includes(role as UserRole);
}

export const publicRoutes = [
  "/",
  "/about",
  "/features",
  "/solutions",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/manifest.webmanifest",
  "/auth/login",
  "/auth/callback",
  "/auth/post-login",
  "/auth/sign-up",
  "/auth/sign-up-success",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
] as const;

export const authRoutes = ["/auth/login", "/auth/sign-up"] as const;

export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => route === pathname);
}

export function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route));
}

export type Permission =
  | "view.dashboard"
  | "view.pos"
  | "view.inventory"
  | "view.transactions"
  | "view.accounts"
  | "view.reports"
  | "view.profile"
  | "view.company"
  | "view.company.settings"
  | "view.company.terminals"
  | "view.company.subscription"
  | "view.product"
  | "view.admin"
  | "view.admin.terminals"
  | "view.admin.subscriptions"
  | "view.admin.approvals";

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view.dashboard",
    "view.accounts",
    "view.reports",
    "view.profile",
    "view.admin",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
    "view.company.subscription",
    "view.admin.terminals",
    "view.admin.subscriptions",
    "view.admin.approvals",
  ],
  manager: [
    "view.dashboard",
    "view.accounts",
    "view.pos",
    "view.inventory",
    "view.product",
    "view.reports",
    "view.profile",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
    "view.company.subscription",
  ],
  cashier: ["view.dashboard", "view.pos", "view.transactions", "view.profile"],
};

export interface AppRouteConfig {
  href: string;
  permission: Permission;
  label: string;
  showInNav: boolean;
}

export function isBillingRestrictedRole(role: string | null): role is "manager" | "cashier" {
  return role === "manager" || role === "cashier";
}

export function isBillingRestrictedRoute(
  role: string | null,
  pathname: string,
): boolean {
  if (role === "manager") {
    return pathname === "/accounts";
  }

  return false;
}

export const appRoutes: AppRouteConfig[] = [
  {
    href: "/pos",
    permission: "view.pos",
    label: "Point of Sale",
    showInNav: true,
  },
  {
    href: "/dashboard",
    permission: "view.dashboard",
    label: "Dashboard",
    showInNav: true,
  },
  {
    href: "/product",
    permission: "view.product",
    label: "Products & Inventory",
    showInNav: true,
  },
  {
    href: "/reports",
    permission: "view.reports",
    label: "Reports",
    showInNav: true,
  },
  {
    href: "/accounts",
    permission: "view.accounts",
    label: "User Management",
    showInNav: true,
  },
  {
    href: "/companies",
    permission: "view.company",
    label: "Manage Companies",
    showInNav: true,
  },
  {
    href: "/companies/[companyId]",
    permission: "view.company",
    label: "Company",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/terminals",
    permission: "view.company.terminals",
    label: "Terminal List",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/subscription",
    permission: "view.company.subscription",
    label: "Subscriptions",
    showInNav: false,
  },
  {
    href: "/terminals",
    permission: "view.admin.terminals",
    label: "Terminals",
    showInNav: false,
  },
  {
    href: "/subscriptions",
    permission: "view.admin.subscriptions",
    label: "Subscriptions",
    showInNav: false,
  },
  {
    href: "/approvals",
    permission: "view.admin.approvals",
    label: "Registration Approvals",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/settings",
    permission: "view.company.settings",
    label: "Business Info",
    showInNav: false,
  },
  {
    href: "/companies/[companyId]/settings/sales-accounts",
    permission: "view.company.settings",
    label: "Sales Accounts",
    showInNav: false,
  },
  {
    href: "/profile",
    permission: "view.profile",
    label: "Profile",
    showInNav: false,
  },
  {
    href: "/accounts/[profileId]",
    permission: "view.profile",
    label: "Profile",
    showInNav: false,
  },
  {
    href: "/settings",
    permission: "view.company.settings",
    label: "Settings",
    showInNav: false,
  },
  {
    href: "/admin",
    permission: "view.admin",
    label: "Administration",
    showInNav: false,
  },
];

function routeToRegExp(href: string) {
  const pattern = href.replace(/\[.+?\]/g, "[^/]+");
  return new RegExp(`^${pattern}(?:/.*)?$`);
}

function getMatchingRoute(pathname: string) {
  const sortedRoutes = [...appRoutes].sort(
    (a, b) => b.href.length - a.href.length,
  );
  return sortedRoutes.find((route) => routeToRegExp(route.href).test(pathname));
}

function isConcreteHref(href: string) {
  return !href.includes("[");
}

export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !isValidUserRole(role)) {
    return [];
  }

  return rolePermissions[role];
}

export function hasPermissionForRoute(
  role: string | null,
  pathname: string,
): boolean {
  const userPermissions = getPermissionsForRole(role);
  const route = getMatchingRoute(pathname);

  if (!route) {
    return true;
  }

  return userPermissions.includes(route.permission);
}

export function getFirstAccessibleRoute(role: string | null): string {
  const userPermissions = getPermissionsForRole(role);
  const first = appRoutes.find(
    (route) =>
      isConcreteHref(route.href) && userPermissions.includes(route.permission),
  );

  return first?.href ?? "/auth/login";
}
