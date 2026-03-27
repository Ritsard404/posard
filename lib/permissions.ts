/**
 * Permissions-based route access control
 * Define granular permissions and assign them to routes
 */

export type Permission =
  | "view.dashboard"
  | "view.pos"
  | "view.inventory"
  | "view.orders"
  | "view.transactions"
  | "view.users"
  | "view.reports"
  | "view.profile"
  | "view.settings";

export interface RoutePermission {
  path: string;
  requiredPermissions: Permission[];
}

/**
 * Map roles to their allowed permissions
 */
export const rolePermissions: Record<string, Permission[]> = {
  admin: [
    "view.dashboard",
    "view.pos",
    "view.inventory",
    "view.orders",
    "view.transactions",
    "view.users",
    "view.reports",
    "view.profile",
    "view.settings",
  ],
  manager: [
    "view.dashboard",
    "view.orders",
    "view.inventory",
    "view.profile",
  ],
  cashier: ["view.dashboard", "view.pos", "view.transactions", "view.profile"],
};

/**
 * Define routes and their required permissions
 */
export const routePermissions: RoutePermission[] = [
  { path: "/dashboard", requiredPermissions: ["view.dashboard"] },
  { path: "/pos", requiredPermissions: ["view.pos"] },
  { path: "/inventory", requiredPermissions: ["view.inventory"] },
  { path: "/orders", requiredPermissions: ["view.orders"] },
  { path: "/transactions", requiredPermissions: ["view.transactions"] },
  { path: "/users", requiredPermissions: ["view.users"] },
  { path: "/reports", requiredPermissions: ["view.reports"] },
  { path: "/profile", requiredPermissions: ["view.profile"] },
  { path: "/settings", requiredPermissions: ["view.settings"] },
];

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !(role in rolePermissions)) return [];
  return rolePermissions[role as keyof typeof rolePermissions] || [];
}
