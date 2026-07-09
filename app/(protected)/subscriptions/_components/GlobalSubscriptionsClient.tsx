"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPaginationControls } from "@/app/(protected)/companies/_components/AdminPaginationControls";
import { SubscriptionFormDialog } from "@/app/(protected)/companies/[companyId]/subscription/_components/SubscriptionFormDialog";
import { cancelGlobalSubscriptionAction, upsertGlobalSubscriptionAction } from "@/app/(protected)/companies/_actions/global-subscription.actions";
import type { UpsertTerminalSubscriptionPayload } from "@/app/(protected)/companies/[companyId]/_services/subscription.dto";
import type { PageResult } from "@/app/(protected)/companies/_services/_dto/common.dto";
import type { AdminSubscriptionListItemDto } from "@/app/(protected)/companies/_services/_dto/admin-subscription.dto";

interface GlobalSubscriptionsClientProps {
  pageData: PageResult<AdminSubscriptionListItemDto>;
  companyOptions: Array<{ id: string; name: string }>;
  platformBillingMode: "FREE" | "PAID";
  keyword?: string;
  status?: "pending" | "active" | "expired" | "suspended" | "cancelled";
  billingCycle?: "monthly" | "quarterly" | "annually";
  companyId?: string;
}

export function GlobalSubscriptionsClient({
  pageData,
  companyOptions,
  platformBillingMode,
  keyword = "",
  status,
  billingCycle,
  companyId,
}: GlobalSubscriptionsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [selectedRow, setSelectedRow] = useState<AdminSubscriptionListItemDto | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId ?? "");
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
        setSelectedRow(null);
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div>
          <h1 className="text-2xl font-bold">Global Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            {platformBillingMode === "FREE"
              ? "POSard is free right now. Subscription records are informational until paid mode is enabled."
              : "Assign, renew, change, and cancel terminal plans."}
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <Input
            value={draftKeyword}
            onChange={(event) => setDraftKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") updateQuery({ keyword: draftKeyword || null, page: "0" });
            }}
            placeholder="Search by terminal or company"
          />
          <select
            value={status ?? ""}
            onChange={(event) => updateQuery({ status: event.target.value || null, page: "0" })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {["pending", "active", "expired", "suspended", "cancelled"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={billingCycle ?? ""}
            onChange={(event) => updateQuery({ billingCycle: event.target.value || null, page: "0" })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All plans</option>
            {["monthly", "quarterly", "annually"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
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
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => updateQuery({ keyword: null, status: null, billingCycle: null, companyId: null, page: "0", size: "10" })}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {pageData.items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No subscriptions found.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    {["Terminal", "Company", "Plan", "Dates", "Status", "Actions"].map((label) => (
                      <th key={label} className={`px-4 py-3 text-left font-medium text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.items.map((row) => (
                    <tr key={row.terminalId} className="border-b">
                      <td className="px-4 py-3 font-medium">{row.terminalName}</td>
                      <td className="px-4 py-3">{row.companyName}</td>
                      <td className="px-4 py-3 capitalize">{row.billingCycle ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>Start: {formatDate(row.startsAt)}</div>
                        <div>End: {formatDate(row.expiresAt)}</div>
                      </td>
                      <td className="px-4 py-3"><SubscriptionStatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>
                            {row.status ? "Change Plan" : "Assign"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>
                            Renew
                          </Button>
                          {row.status ? (
                            <Button variant="destructive" size="sm" onClick={() => mutate(() => cancelGlobalSubscriptionAction(row.companyId, row.terminalId), "Subscription cancelled")}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageData.items.map((row) => (
                <Card key={row.terminalId} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{row.terminalName}</div>
                        <div className="text-xs text-muted-foreground">{row.companyName}</div>
                      </div>
                      <SubscriptionStatusBadge status={row.status} />
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">{row.billingCycle ?? "Unassigned"}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>Edit</Button>
                      {row.status ? <Button variant="destructive" size="sm" onClick={() => mutate(() => cancelGlobalSubscriptionAction(row.companyId, row.terminalId), "Subscription cancelled")}>Cancel</Button> : null}
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

      <SubscriptionFormDialog
        open={Boolean(selectedRow)}
        terminal={selectedRow ? { id: selectedRow.terminalId, posName: selectedRow.terminalName } : null}
        subscription={
          selectedRow && selectedRow.status
            ? {
                id: selectedRow.terminalId,
                terminalId: selectedRow.terminalId,
                billingCycle: selectedRow.billingCycle ?? "monthly",
                status: selectedRow.status,
                startsAt: selectedRow.startsAt,
                expiresAt: selectedRow.expiresAt,
                renewedAt: selectedRow.renewedAt,
                autoRenew: selectedRow.autoRenew,
                price: selectedRow.price,
                notes: selectedRow.notes,
                createdAt: selectedRow.startsAt ?? new Date(),
                updatedAt: selectedRow.renewedAt ?? selectedRow.startsAt ?? new Date(),
                terminal: {
                  id: selectedRow.terminalId,
                  posName: selectedRow.terminalName,
                  registeredName: selectedRow.terminalName,
                  isActive: selectedRow.isTerminalActive,
                  isTrainMode: false,
                },
              }
            : undefined
        }
        isSubmitting={isPending}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
        onSubmit={(terminalId, values: UpsertTerminalSubscriptionPayload) => {
          if (!selectedRow) return;
          mutate(() => upsertGlobalSubscriptionAction(selectedRow.companyId, terminalId, values), "Subscription saved");
        }}
      />
    </div>
  );
}

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function SubscriptionStatusBadge({ status }: { status: "pending" | "active" | "expired" | "suspended" | "cancelled" | null }) {
  if (!status) {
    return <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">unassigned</span>;
  }

  const styles = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    expired: "border-rose-200 bg-rose-50 text-rose-700",
    suspended: "border-sky-200 bg-sky-50 text-sky-700",
    cancelled: "border-zinc-200 bg-zinc-100 text-zinc-700",
  } as const;

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>{status}</span>;
}
