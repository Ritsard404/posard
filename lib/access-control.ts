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
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "admin" | "manager" | "cashier";

export const roles: UserRole[] = ["admin", "manager", "cashier"];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === "string" && roles.includes(role as UserRole);
}

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
    "view.accounts",
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

export interface RouteConfig {
  href: string;
  permission: Permission;
  label: string;
  icon: LucideIcon;
  showInNav: boolean;
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
    showInNav: true,
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

function routeToRegExp(href: string) {
  const pattern = href.replace(/\[.+?\]/g, "[^/]+");
  return new RegExp(`^${pattern}(?:/.*)?$`);
}

function getMatchingRoute(pathname: string) {
  const sortedRoutes = [...routes].sort((a, b) => b.href.length - a.href.length);
  return sortedRoutes.find((route) => routeToRegExp(route.href).test(pathname));
}

function isConcreteHref(href: string) {
  return !href.includes("[");
}

export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !isValidUserRole(role)) return [];
  return rolePermissions[role];
}

export function getNavByRole(role: UserRole) {
  const userPermissions = rolePermissions[role] ?? [];
  return routes.filter(
    (route) => route.showInNav && userPermissions.includes(route.permission),
  );
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
  const first = routes.find(
    (route) => isConcreteHref(route.href) && userPermissions.includes(route.permission),
  );
  return first?.href ?? "/auth/login";
}
