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
    <div className="space-y-3">
      <Card className="border-border/80 p-3 shadow-sm sm:p-4">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">Permission Matrix</h1>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
          Default role access used by route guards, services, and upcoming feature modules.
        </p>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="hidden max-h-[calc(100vh-12rem)] overflow-auto md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Permission
                </th>
                {matrix.roles.map((role) => (
                  <th
                    key={role.role}
                    className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                      className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                      colSpan={matrix.roles.length + 1}
                    >
                      {group}
                    </td>
                  </tr>
                  {permissions.map((permission) => (
                    <tr key={permission.key} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{permission.label}</span>
                          {permission.isSensitive ? (
                            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">Sensitive</Badge>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {permission.key}
                        </div>
                      </td>
                      {matrix.roles.map((role) => (
                        <td key={role.role} className="px-3 py-2 text-center">
                          {role.permissions.includes(permission.key) ? (
                            <Badge className="h-5 rounded-full px-2 text-[11px]">Allowed</Badge>
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

        <div className="space-y-2 p-2 md:hidden">
          {Object.entries(grouped).map(([group, permissions]) => (
            <div key={group} className="space-y-2">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {group}
              </div>
              {permissions.map((permission) => (
                <Card key={permission.key} className="border-border/80 p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{permission.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {permission.key}
                      </div>
                    </div>
                    {permission.isSensitive ? (
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">Sensitive</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {matrix.roles.map((role) => (
                      <Badge
                        key={role.role}
                        variant={
                          role.permissions.includes(permission.key)
                            ? "default"
                            : "secondary"
                        }
                        className="h-5 rounded-full px-2 text-[11px]"
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
