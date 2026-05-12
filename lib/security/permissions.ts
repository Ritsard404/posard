import "server-only";

import { type UserRole, getPermissionsForRole, type Permission } from "@/lib/access-control-core";

export function assertRole(role: string | null | undefined, allowed: UserRole[]) {
  if (!role || !allowed.includes(role as UserRole)) {
    throw new Error("Forbidden");
  }
}

export function hasPermission(role: string | null | undefined, permission: Permission) {
  return getPermissionsForRole(role ?? null).includes(permission);
}

export function assertPermission(role: string | null | undefined, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("Forbidden");
  }
}
