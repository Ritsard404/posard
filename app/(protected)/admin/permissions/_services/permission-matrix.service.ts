import "server-only";

import type { PermissionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  permissionCatalog,
  rolePermissions,
  roles,
  type Permission,
} from "@/lib/access-control-core";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import type { PermissionMatrixDto } from "./_dto/permission-matrix.dto";

function assertAdmin(viewer: AccountsViewerDto) {
  if (viewer.role !== "admin") {
    throw new Error("Forbidden");
  }
}

const permissionKeyByAppKey = new Map(
  permissionCatalog.map((permission) => [permission.key, permission.prismaKey]),
);

function toPrismaPermissionKey(permission: Permission): PermissionKey {
  const key = permissionKeyByAppKey.get(permission);

  if (!key) {
    throw new Error(`Permission ${permission} is not mapped to Prisma.`);
  }

  return key as PermissionKey;
}

function buildFallbackMatrix(): PermissionMatrixDto {
  return {
    permissions: permissionCatalog.map((permission) => ({
      key: permission.prismaKey,
      group: permission.group,
      label: permission.label,
      description: permission.description ?? null,
      isSensitive: permission.isSensitive ?? false,
    })),
    roles: roles.map((role) => ({
      role,
      permissions: rolePermissions[role].map(toPrismaPermissionKey),
    })),
  };
}

export const permissionMatrixService = {
  async syncDefaults(viewer: AccountsViewerDto): Promise<void> {
    assertAdmin(viewer);

    await prisma.$transaction(async (tx) => {
      for (const permission of permissionCatalog) {
        await tx.permission.upsert({
          where: { key: permission.prismaKey as PermissionKey },
          update: {
            group: permission.group,
            label: permission.label,
            description: permission.description ?? null,
            isSensitive: permission.isSensitive ?? false,
          },
          create: {
            key: permission.prismaKey as PermissionKey,
            group: permission.group,
            label: permission.label,
            description: permission.description ?? null,
            isSensitive: permission.isSensitive ?? false,
          },
        });
      }

      for (const role of roles) {
        for (const permission of rolePermissions[role]) {
          const permissionKey = toPrismaPermissionKey(permission);
          const existing = await tx.rolePermission.findFirst({
            where: { companyId: null, role, permissionKey },
            select: { id: true },
          });

          if (existing) {
            await tx.rolePermission.update({
              where: { id: existing.id },
              data: { effect: "allow" },
            });
          } else {
            await tx.rolePermission.create({
              data: {
                companyId: null,
                role,
                permissionKey,
                effect: "allow",
                createdById: viewer.profileId,
              },
            });
          }
        }
      }
    });
  },

  async getMatrix(viewer: AccountsViewerDto): Promise<PermissionMatrixDto> {
    assertAdmin(viewer);

    try {
      await this.syncDefaults(viewer);
    } catch (error) {
      console.error("Permission matrix default sync failed", error);
      return buildFallbackMatrix();
    }

    try {
      const [permissions, grants] = await Promise.all([
        prisma.permission.findMany({
          orderBy: [{ group: "asc" }, { label: "asc" }],
        }),
        prisma.rolePermission.findMany({
          where: { companyId: null, effect: "allow" },
          select: { role: true, permissionKey: true },
        }),
      ]);

      const permissionsByRole = new Map(
        roles.map((role) => [role, new Set<string>()]),
      );

      for (const grant of grants) {
        permissionsByRole.get(grant.role)?.add(grant.permissionKey);
      }

      return {
        permissions: permissions.map((permission) => ({
          key: permission.key,
          group: permission.group,
          label: permission.label,
          description: permission.description,
          isSensitive: permission.isSensitive,
        })),
        roles: roles.map((role) => ({
          role,
          permissions: Array.from(permissionsByRole.get(role) ?? []),
        })),
      };
    } catch (error) {
      console.error("Permission matrix read failed", error);
      return buildFallbackMatrix();
    }
  },
};
