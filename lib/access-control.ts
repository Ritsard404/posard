/**
 * access-control.ts
 *
 * Single source of truth for roles, permissions, routes, and navigation.
 * Middleware and nav components both import from here.
 */

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  BaggageClaimIcon,
  Package,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

// ── Roles ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "cashier";

export const roles: UserRole[] = ["admin", "manager", "cashier"];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && roles.includes(role as UserRole);
}

// ── Permissions ───────────────────────────────────────────────────────────────

export type Permission =
  | "view.dashboard"
  | "view.pos"
  | "view.inventory"
  | "view.orders"
  | "view.transactions"
  | "view.accounts"
  | "view.reports"
  | "view.profile"
  | "view.company"
  | "view.company.settings"
  | "view.company.terminals"
  | "view.company.subscription"
  | "view.product"
  | "view.admin";

// ── Role → Permissions ────────────────────────────────────────────────────────

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view.dashboard",
    "view.accounts",
    "view.reports",
    "view.profile",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
    "view.company.subscription",
  ],
  manager: [
    "view.dashboard",
    "view.pos",
    "view.orders",
    "view.inventory",
    "view.product",
    "view.reports",
    "view.profile",
    "view.company",
    "view.company.settings",
    "view.company.terminals",
  ],
  cashier: ["view.dashboard", "view.pos", "view.transactions", "view.profile"],
};

// ── Route + Nav Config ────────────────────────────────────────────────────────
// One entry per route — drives both middleware protection and sidebar nav.
// ⚠️ `href` must match your Next.js app folder path exactly.

export interface RouteConfig {
  href: string; // must match app/(protected)/[href] folder
  permission: Permission; // required permission to access this route
  label: string; // sidebar nav label
  icon: LucideIcon; // sidebar nav icon
  showInNav: boolean; // false = protected but not shown in sidebar
}

export const routes: RouteConfig[] = [
  {
    href: "/dashboard",
    permission: "view.dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    showInNav: true,
  },
  {
    href: "/pos",
    permission: "view.pos",
    label: "Point of Sale",
    icon: ShoppingCart,
    showInNav: true,
  },

  {
    href: "/product",
    permission: "view.product",
    label: "Products",
    icon: BaggageClaimIcon,
    showInNav: true,
  },

  {
    href: "/report",
    permission: "view.reports",
    label: "Reports",
    icon: BarChart3,
    showInNav: true,
  },

  {
    href: "/accounts",
    permission: "view.accounts",
    label: "Accounts",
    icon: Users,
    showInNav: true,
  },

  {
    href: "/companies",
    permission: "view.company",
    label: "Company",
    icon: Users,
    showInNav: true, // admin only will see this
  },

  {
    href: "/companies/[companyId]",
    permission: "view.company",
    label: "Company",
    icon: Users,
    showInNav: false,
  },

  {
    href: "/companies/[companyId]/terminals",
    permission: "view.company.terminals",
    label: "Terminals",
    icon: BaggageClaimIcon,
    showInNav: false,
  },

  {
    href: "/companies/[companyId]/subscription",
    permission: "view.company.subscription",
    label: "Subscription",
    icon: BarChart3,
    showInNav: false,
  },

  {
    href: "/companies/[companyId]/settings",
    permission: "view.company.settings",
    label: "Settings",
    icon: Settings,
    showInNav: false,
  },

  {
    href: "/profile",
    permission: "view.profile",
    label: "Profile",
    icon: Settings,
    showInNav: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !isValidUserRole(role)) return [];
  return rolePermissions[role];
}

/** Sidebar nav — only routes this role can access and that have showInNav: true */
export function getNavByRole(role: UserRole) {
  const userPermissions = rolePermissions[role] ?? [];
  return routes.filter(
    (r) => r.showInNav && userPermissions.includes(r.permission),
  );
}

/** Middleware — does this role have access to this pathname? */
export function hasPermissionForRoute(
  role: string | null,
  pathname: string,
): boolean {
  const userPermissions = getPermissionsForRole(role);
  const route = routes.find(
    (r) => pathname === r.href || pathname.startsWith(r.href + "/"),
  );
  if (!route) return true; // not a protected route — allow
  return userPermissions.includes(route.permission);
}

/** Middleware — first route this role can access (used for redirects) */
export function getFirstAccessibleRoute(role: string | null): string {
  const userPermissions = getPermissionsForRole(role);
  const first = routes.find((r) => userPermissions.includes(r.permission));
  return first?.href ?? "/auth/login";
}
