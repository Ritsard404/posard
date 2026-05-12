import type { UserRole } from "@/lib/access-control-core";

export interface PermissionMatrixPermissionDto {
  key: string;
  group: string;
  label: string;
  description: string | null;
  isSensitive: boolean;
}

export interface PermissionMatrixRoleDto {
  role: UserRole;
  permissions: string[];
}

export interface PermissionMatrixDto {
  permissions: PermissionMatrixPermissionDto[];
  roles: PermissionMatrixRoleDto[];
}
