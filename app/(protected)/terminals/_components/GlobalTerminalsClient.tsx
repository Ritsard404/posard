"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPaginationControls } from "@/app/(protected)/companies/_components/AdminPaginationControls";
import { createTerminalAction, deleteTerminalAction, getTerminalAction, updateTerminalAction } from "@/app/(protected)/companies/[companyId]/_actions/terminal.actions";
import { toggleGlobalTerminalAction } from "@/app/(protected)/companies/_actions/global-terminal.actions";
import type { PageResult } from "@/app/(protected)/companies/_services/_dto/common.dto";
import type { AdminTerminalListItemDto } from "@/app/(protected)/companies/_services/_dto/admin-terminal.dto";
import type { TerminalDTO, CreateTerminalPayload } from "@/app/(protected)/companies/[companyId]/_services/terminal.dto";
import { GlobalTerminalDialog } from "./GlobalTerminalDialog";

interface GlobalTerminalsClientProps {
  pageData: PageResult<AdminTerminalListItemDto>;
  companyOptions: Array<{ id: string; name: string }>;
  keyword?: string;
  status?: "active" | "inactive" | "in_use";
  companyId?: string;
}

export function GlobalTerminalsClient({
  pageData,
  companyOptions,
  keyword = "",
  status,
  companyId,
}: GlobalTerminalsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<TerminalDTO | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId ?? companyOptions[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function updateQuery(next: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  function mutate(task: () => Promise<{ success: boolean; error?: string }>, successMessage: string) {
    startTransition(() => {
      void (async () => {
        const result = await task();
        if (!result.success) {
          toast.error(result.error ?? "Request failed");
          return;
        }

        toast.success(successMessage);
        setDialogOpen(false);
        setEditingTerminal(null);
        router.refresh();
      })();
    });
  }

  function openCreate() {
    setEditingTerminal(null);
    setDialogOpen(true);
  }

  function openEdit(terminalId: string, terminalCompanyId: string) {
    startTransition(() => {
      void (async () => {
        const result = await getTerminalAction(terminalId, terminalCompanyId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setEditingTerminal(result.data);
        setSelectedCompanyId(terminalCompanyId);
        setDialogOpen(true);
      })();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Global Terminals</h1>
            <p className="text-sm text-muted-foreground">Manage terminals across all companies.</p>
          </div>
          <Button onClick={openCreate}>Create Terminal</Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <Input
            value={draftKeyword}
            onChange={(event) => setDraftKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateQuery({ keyword: draftKeyword || null, page: "0" });
              }
            }}
            placeholder="Search by terminal or company"
          />
          <div className="flex flex-wrap gap-2">
            {(["active", "inactive", "in_use"] as const).map((option) => (
              <Button key={option} variant={status === option ? "default" : "outline"} onClick={() => updateQuery({ status: option, page: "0" })}>
                {option}
              </Button>
            ))}
            <Button variant={!status ? "default" : "outline"} onClick={() => updateQuery({ status: null, page: "0" })}>
              all
            </Button>
          </div>
          <select
            value={selectedCompanyId}
            onChange={(event) => {
              setSelectedCompanyId(event.target.value);
              updateQuery({ companyId: event.target.value || null, page: "0" });
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All companies</option>
            {companyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => updateQuery({ keyword: null, status: null, companyId: null, page: "0", size: "10" })}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {pageData.items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No terminals found.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    {["Terminal", "Company", "Status", "Assigned User", "Created", "Actions"].map((label) => (
                      <th key={label} className={`px-4 py-3 text-left font-medium text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.items.map((terminal) => (
                    <tr key={terminal.id} className="border-b">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{terminal.posName ?? "Unnamed terminal"}</div>
                        <div className="text-xs text-muted-foreground">{terminal.registeredName ?? "No registered name"}</div>
                      </td>
                      <td className="px-4 py-3">{terminal.companyName}</td>
                      <td className="px-4 py-3"><TerminalStatusBadge status={terminal.approvalStatus} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{terminal.assignedUserName ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(terminal.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(terminal.id, terminal.companyId)}>Edit</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              mutate(
                                () => toggleGlobalTerminalAction(terminal.id, terminal.companyId, { isActive: !terminal.isActive }),
                                terminal.isActive ? "Terminal disabled" : "Terminal enabled",
                              )
                            }
                          >
                            {terminal.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => mutate(() => deleteTerminalAction(terminal.id, terminal.companyId), "Terminal deleted")}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageData.items.map((terminal) => (
                <Card key={terminal.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{terminal.posName ?? "Unnamed terminal"}</div>
                        <div className="text-xs text-muted-foreground">{terminal.companyName}</div>
                      </div>
                      <TerminalStatusBadge status={terminal.approvalStatus} />
                    </div>
                    <div className="text-sm text-muted-foreground">Assigned: {terminal.assignedUserName ?? "Unassigned"}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(terminal.id, terminal.companyId)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => mutate(() => toggleGlobalTerminalAction(terminal.id, terminal.companyId, { isActive: !terminal.isActive }), terminal.isActive ? "Terminal disabled" : "Terminal enabled")}>
                        {terminal.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <AdminPaginationControls
              page={pageData.page}
              size={pageData.size}
              totalCount={pageData.totalCount}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateQuery({ page: String(page) })}
              onSizeChange={(size) => updateQuery({ size: String(size), page: "0" })}
            />
          </>
        )}
      </Card>

      <GlobalTerminalDialog
        open={dialogOpen}
        terminal={editingTerminal}
        companyId={selectedCompanyId}
        companyOptions={companyOptions}
        isSubmitting={isPending}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTerminal(null);
        }}
        onSubmit={(targetCompanyId, values: CreateTerminalPayload) =>
          mutate(
            () =>
              editingTerminal
                ? updateTerminalAction(editingTerminal.id, editingTerminal.companyId, values)
                : createTerminalAction(targetCompanyId, values),
            editingTerminal ? "Terminal updated" : "Terminal created",
          )
        }
      />
    </div>
  );
}

function TerminalStatusBadge({ status }: { status: "active" | "inactive" | "in_use" }) {
  const styles = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-zinc-200 bg-zinc-100 text-zinc-700",
    in_use: "border-sky-200 bg-sky-50 text-sky-700",
  } as const;

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>{status.replace("_", " ")}</span>;
}
