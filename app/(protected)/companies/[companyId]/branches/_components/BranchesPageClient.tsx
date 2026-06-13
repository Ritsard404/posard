"use client";

import { useState, useTransition } from "react";
import type React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BranchDTO, BranchManagerOptionDTO } from "../../_services/branch.dto";
import { BranchUpsertSchema } from "../../_services/branch.dto";
import {
  createBranchAction,
  disableBranchAction,
  updateBranchAction,
} from "../../_actions/branch.actions";

type BranchFormValues = z.input<typeof BranchUpsertSchema>;

interface BranchesPageClientProps {
  companyId: string;
  branches: BranchDTO[];
  managerOptions: BranchManagerOptionDTO[];
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; branch: BranchDTO }
  | null;

export function BranchesPageClient({
  companyId,
  branches,
  managerOptions,
}: BranchesPageClientProps) {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [isPending, startTransition] = useTransition();

  function disableBranch(branch: BranchDTO) {
    if (!window.confirm(`Disable ${branch.name}? Historical sales stay linked.`)) {
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await disableBranchAction(companyId, branch.id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }

        toast.success("Branch disabled");
      })();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Create operational branches with a default POS terminal, branch settings, and cashier scope.
          </p>
        </div>
        <Button onClick={() => setDialogState({ mode: "create" })}>
          <Plus className="size-4" />
          Add Branch
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Branches" value={String(branches.length)} />
        <SummaryCard
          label="Active"
          value={String(branches.filter((branch) => branch.isActive).length)}
        />
        <SummaryCard
          label="Cashiers"
          value={String(
            branches.reduce((total, branch) => total + branch.cashierCount, 0),
          )}
        />
        <SummaryCard
          label="Default POS"
          value={String(branches.filter((branch) => branch.terminalCount > 0).length)}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Branch", "Manager", "Cashiers", "Terminals", "Today", "Status", "Actions"].map(
                  (label) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground ${
                        label === "Actions" ? "text-right" : ""
                      }`}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{branch.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {branch.address ?? "No address"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {branch.managerName ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3">{branch.cashierCount}</td>
                  <td className="px-4 py-3">{branch.terminalCount}</td>
                  <td className="px-4 py-3">
                    PHP {branch.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <div className="text-xs text-muted-foreground">
                      {branch.todayTransactions} transaction{branch.todayTransactions === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={branch.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialogState({ mode: "edit", branch })}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      {branch.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disableBranch(branch)}
                        >
                          <Power className="size-4" />
                          Disable
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {branches.map((branch) => (
            <Card key={branch.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{branch.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {branch.code ?? "No code"} · {branch.address ?? "No address"}
                  </p>
                </div>
                <StatusPill active={branch.isActive} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <MiniStat label="Cashiers" value={String(branch.cashierCount)} />
                <MiniStat label="Terminals" value={String(branch.terminalCount)} />
                <MiniStat label="Invoices" value={String(branch.invoiceCount)} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogState({ mode: "edit", branch })}
                >
                  Edit
                </Button>
                {branch.isActive ? (
                  <Button size="sm" variant="outline" onClick={() => disableBranch(branch)}>
                    Disable
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <BranchDialog
        companyId={companyId}
        state={dialogState}
        managerOptions={managerOptions}
        isPending={isPending}
        startTransition={startTransition}
        onClose={() => setDialogState(null)}
      />
    </div>
  );
}

function BranchDialog({
  companyId,
  state,
  managerOptions,
  isPending,
  startTransition,
  onClose,
}: {
  companyId: string;
  state: DialogState;
  managerOptions: BranchManagerOptionDTO[];
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onClose: () => void;
}) {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(BranchUpsertSchema),
    values: {
      name: state?.mode === "edit" ? state.branch.name : "",
      code: state?.mode === "edit" ? state.branch.code : "",
      address: state?.mode === "edit" ? state.branch.address : "",
      phone: state?.mode === "edit" ? state.branch.phone : "",
      email: state?.mode === "edit" ? state.branch.email : "",
      managerId: state?.mode === "edit" ? state.branch.managerId : "",
      timezone: state?.mode === "edit" ? state.branch.timezone : "Asia/Manila",
      currency: state?.mode === "edit" ? state.branch.currency : "PHP",
      taxMode:
        state?.mode === "edit" && state.branch.taxMode === "override"
          ? "override"
          : "inherit",
      taxRate: state?.mode === "edit" ? state.branch.taxRate : null,
      receiptFooter: state?.mode === "edit" ? state.branch.receiptFooter : "",
      logoImageUrl: state?.mode === "edit" ? state.branch.logoImageUrl : "",
      openingDate:
        state?.mode === "edit" && state.branch.openingDate
          ? state.branch.openingDate.toISOString().slice(0, 10)
          : "",
      invoicePrefix: state?.mode === "edit" ? state.branch.invoicePrefix : "",
      isActive: state?.mode === "edit" ? state.branch.isActive : true,
    },
  });

  if (!state) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {state.mode === "create" ? "Add Branch" : "Edit Branch"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(() => {
              void (async () => {
                const result =
                  state.mode === "create"
                    ? await createBranchAction(companyId, values)
                    : await updateBranchAction(companyId, state.branch.id, values);

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                toast.success(state.mode === "create" ? "Branch created" : "Branch updated");
                onClose();
              })();
            });
          })}
        >
          {state.mode === "create" ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
              Saving this branch also creates an active default POS terminal named Terminal 1.
            </div>
          ) : null}
          <BranchField label="Name" id="branch-name" error={form.formState.errors.name?.message}>
            <Input id="branch-name" disabled={isPending} {...form.register("name")} />
          </BranchField>
          <BranchField label="Code" id="branch-code" error={form.formState.errors.code?.message}>
            <Input id="branch-code" disabled={isPending} {...form.register("code")} />
          </BranchField>
          <BranchField
            label="Address"
            id="branch-address"
            error={form.formState.errors.address?.message}
          >
            <Input id="branch-address" disabled={isPending} {...form.register("address")} />
          </BranchField>
          <div className="grid gap-4 sm:grid-cols-2">
            <BranchField label="Phone" id="branch-phone" error={form.formState.errors.phone?.message}>
              <Input id="branch-phone" disabled={isPending} {...form.register("phone")} />
            </BranchField>
            <BranchField label="Email" id="branch-email" error={form.formState.errors.email?.message}>
              <Input id="branch-email" type="email" disabled={isPending} {...form.register("email")} />
            </BranchField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BranchField label="Manager" id="branch-manager" error={form.formState.errors.managerId?.message}>
              <select
                id="branch-manager"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={isPending}
                {...form.register("managerId")}
              >
                <option value="">Unassigned</option>
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </BranchField>
            <BranchField label="Opening Date" id="branch-opening-date" error={form.formState.errors.openingDate?.message}>
              <Input id="branch-opening-date" type="date" disabled={isPending} {...form.register("openingDate")} />
            </BranchField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <BranchField label="Timezone" id="branch-timezone" error={form.formState.errors.timezone?.message}>
              <Input id="branch-timezone" disabled={isPending} {...form.register("timezone")} />
            </BranchField>
            <BranchField label="Currency" id="branch-currency" error={form.formState.errors.currency?.message}>
              <Input id="branch-currency" disabled={isPending} {...form.register("currency")} />
            </BranchField>
            <BranchField label="Invoice Prefix" id="branch-invoice-prefix" error={form.formState.errors.invoicePrefix?.message}>
              <Input id="branch-invoice-prefix" disabled={isPending} {...form.register("invoicePrefix")} />
            </BranchField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BranchField label="Tax Settings" id="branch-tax-mode" error={form.formState.errors.taxMode?.message}>
              <select
                id="branch-tax-mode"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={isPending}
                {...form.register("taxMode")}
              >
                <option value="inherit">Inherit company defaults</option>
                <option value="override">Override for this branch</option>
              </select>
            </BranchField>
            <BranchField label="Tax Rate" id="branch-tax-rate" error={form.formState.errors.taxRate?.message}>
              <Input id="branch-tax-rate" type="number" min="0" max="100" step="0.01" disabled={isPending} {...form.register("taxRate")} />
            </BranchField>
          </div>
          <BranchField label="Receipt Footer" id="branch-receipt-footer" error={form.formState.errors.receiptFooter?.message}>
            <Input id="branch-receipt-footer" disabled={isPending} {...form.register("receiptFooter")} />
          </BranchField>
          <BranchField label="Logo Override" id="branch-logo" error={form.formState.errors.logoImageUrl?.message}>
            <Input id="branch-logo" disabled={isPending} {...form.register("logoImageUrl")} />
          </BranchField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BranchField({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <Building2 className="size-4" />
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-100 text-zinc-600"
      }`}
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}
