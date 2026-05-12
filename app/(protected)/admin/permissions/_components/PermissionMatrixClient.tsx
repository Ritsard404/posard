"use client";

import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PermissionMatrixDto } from "../_services/_dto/permission-matrix.dto";

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function PermissionMatrixClient({ matrix }: { matrix: PermissionMatrixDto }) {
  const grouped = matrix.permissions.reduce<Record<string, typeof matrix.permissions>>(
    (groups, permission) => {
      groups[permission.group] = groups[permission.group] ?? [];
      groups[permission.group].push(permission);
      return groups;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h1 className="text-xl font-bold">Permission Matrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default role access used by route guards, services, and upcoming feature modules.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Permission
                </th>
                {matrix.roles.map((role) => (
                  <th
                    key={role.role}
                    className="px-4 py-3 text-center font-medium text-muted-foreground"
                  >
                    {formatRole(role.role)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([group, permissions]) => (
                <Fragment key={group}>
                  <tr key={group} className="border-b bg-muted/20">
                    <td
                      className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground"
                      colSpan={matrix.roles.length + 1}
                    >
                      {group}
                    </td>
                  </tr>
                  {permissions.map((permission) => (
                    <tr key={permission.key} className="border-b">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{permission.label}</span>
                          {permission.isSensitive ? (
                            <Badge variant="secondary">Sensitive</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {permission.key}
                        </div>
                      </td>
                      {matrix.roles.map((role) => (
                        <td key={role.role} className="px-4 py-3 text-center">
                          {role.permissions.includes(permission.key) ? (
                            <Badge className="rounded-full">Allowed</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {Object.entries(grouped).map(([group, permissions]) => (
            <div key={group} className="space-y-2">
              <div className="px-1 text-xs font-bold uppercase text-muted-foreground">
                {group}
              </div>
              {permissions.map((permission) => (
                <Card key={permission.key} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{permission.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {permission.key}
                      </div>
                    </div>
                    {permission.isSensitive ? (
                      <Badge variant="secondary">Sensitive</Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matrix.roles.map((role) => (
                      <Badge
                        key={role.role}
                        variant={
                          role.permissions.includes(permission.key)
                            ? "default"
                            : "secondary"
                        }
                      >
                        {formatRole(role.role)}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
