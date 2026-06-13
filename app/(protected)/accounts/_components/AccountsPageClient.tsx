"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  MonitorSmartphone,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountDialog } from "./AccountDialog";
import type {
  AccountCompanyOptionDto,
  AccountDetailDto,
  AccountListItemDto,
  AccountsViewerDto,
  ManagedAccountRole,
} from "../_services/_dto/accounts.dto";
import {
  activateAccountAction,
  approveAccountAction,
  createAccountAction,
  deactivateAccountAction,
  deleteAccountAction,
  getAccountsAction,
  updateAccountAction,
  updateOwnAccountProfileAction,
} from "../_actions/accounts.action";

interface AccountsPageClientProps {
  viewer: AccountsViewerDto;
  initialAccounts: AccountListItemDto[];
  companyOptions: AccountCompanyOptionDto[];
  selfAccount: AccountDetailDto;
}

type DialogState =
  | { type: "create"; role: ManagedAccountRole }
  | { type: "edit"; account: AccountListItemDto }
  | { type: "self" }
  | null;

type FiltersState = {
  keyword: string;
  status: "" | "pending" | "active" | "disabled";
  role: "" | "manager" | "cashier";
  companyId: string;
};

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  disabled: "bg-red-500/10 text-red-500 border border-red-500/20",
} as const;

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: AccountListItemDto["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function AccountsPageClient({
  viewer,
  initialAccounts,
  companyOptions,
  selfAccount,
}: AccountsPageClientProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [myAccount, setMyAccount] = useState(selfAccount);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [filters, setFilters] = useState<FiltersState>({
    keyword: "",
    status: "",
    role: "",
    companyId: "",
  });
  const [isPending, startTransition] = useTransition();

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((account) => account.status === "active").length;
  const pendingAccounts = accounts.filter((account) => account.status === "pending").length;
  const disabledAccounts = accounts.filter((account) => account.status === "disabled").length;
  const selectedCompanyForCapacity =
    viewer.role === "manager"
      ? companyOptions[0]
      : filters.companyId
        ? companyOptions.find((company) => company.id === filters.companyId)
        : undefined;
  const aggregateCapacity = companyOptions.reduce(
    (summary, company) => ({
      terminalCount: summary.terminalCount + company.terminalCount,
      cashierCount: summary.cashierCount + company.cashierCount,
      cashierLimit: summary.cashierLimit + company.cashierLimit,
      cashierSlotsAvailable:
        summary.cashierSlotsAvailable + company.cashierSlotsAvailable,
    }),
    {
      terminalCount: 0,
      cashierCount: 0,
      cashierLimit: 0,
      cashierSlotsAvailable: 0,
    },
  );
  const cashierCapacity = selectedCompanyForCapacity ?? aggregateCapacity;
  const canCreateCashier =
    viewer.role === "admin" || cashierCapacity.cashierSlotsAvailable > 0;

  function refreshAccounts(nextFilters: FiltersState = filters) {
    startTransition(() => {
      void (async () => {
        const result = await getAccountsAction({
          keyword: nextFilters.keyword || undefined,
          status: nextFilters.status || undefined,
          role: viewer.role === "admin" ? nextFilters.role || undefined : undefined,
          companyId:
            viewer.role === "admin" ? nextFilters.companyId || undefined : undefined,
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setAccounts(result.data);
      })();
    });
  }

  function runMutation(task: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(() => {
      void (async () => {
        const result = await task();

        if (!result.success) {
          toast.error(result.error ?? "Request failed");
          return;
        }

        refreshAccounts();
        router.refresh();
      })();
    });
  }

  function handleDelete(account: AccountListItemDto) {
    if (!window.confirm(`Delete ${account.email}? This cannot be undone.`)) {
      return;
    }

    runMutation(() => deleteAccountAction(account.id));
  }

  function renderDialog() {
    if (!dialogState) {
      return null;
    }

    if (dialogState.type === "create") {
      return (
        <AccountDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialogState(null);
            }
          }}
          mode="create"
          isPending={isPending}
          title={
            dialogState.role === "manager"
              ? "Create Manager Account"
              : "Create Cashier Account"
          }
          description={
            dialogState.role === "manager"
              ? "Invite a new manager and assign the account to a company."
              : "Create a cashier account with login credentials and assign it to a company."
          }
          viewerRole={viewer.role}
          companyOptions={companyOptions}
          allowedRoles={[dialogState.role]}
          initialValues={{
            role: dialogState.role,
            companyId: viewer.role === "manager" ? viewer.companyId : companyOptions[0]?.id,
            branchId: "",
          }}
          onCreateSubmit={(values) => {
            runMutation(async () => {
              const result = await createAccountAction(values);

              if (result.success) {
                toast.success("Account created");
                setDialogState(null);
              }

              return result;
            });
          }}
        />
      );
    }

    if (dialogState.type === "edit") {
      return (
        <AccountDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialogState(null);
            }
          }}
          mode="edit"
          isPending={isPending}
          title={`Edit ${dialogState.account.role} account`}
          description="Update the account profile, company assignment, or login password."
          viewerRole={viewer.role}
          companyOptions={companyOptions}
          initialValues={{
            fullName: dialogState.account.fullName,
            companyId: dialogState.account.company.id,
            branchId: dialogState.account.branch.id,
          }}
          onEditSubmit={(values) => {
            runMutation(async () => {
              const result = await updateAccountAction(
                dialogState.account.id,
                values,
              );

              if (result.success) {
                toast.success("Account updated");
                setDialogState(null);
              }

              return result;
            });
          }}
        />
      );
    }

    return (
      <AccountDialog
        open
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(null);
          }
        }}
        mode="self"
        isPending={isPending}
        title="Update My Profile"
        description="Edit your profile information or change your login password."
        viewerRole={viewer.role}
        companyOptions={companyOptions}
        initialValues={{
          email: myAccount.email,
          fullName: myAccount.fullName,
        }}
        onSelfSubmit={(values) => {
          startTransition(() => {
            void (async () => {
              const result = await updateOwnAccountProfileAction(values);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              setMyAccount(result.data);
              toast.success(
                values.email
                  ? "Verification link sent to the new email"
                  : "Profile updated",
              );
              setDialogState(null);
              router.refresh();
            })();
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card border-white/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Scope
          </p>
          <p className="mt-2 text-2xl font-heading font-extrabold tracking-tight">
            {viewer.role}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewer.role === "admin"
              ? "Managers and cashiers across the workspace"
              : "Cashiers in your assigned company"}
          </p>
        </Card>
        <Card className="glass-card border-white/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Total
          </p>
          <p className="mt-2 text-2xl font-heading font-extrabold tracking-tight">
            {totalAccounts}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Visible accounts</p>
        </Card>
        <Card className="glass-card border-white/5 p-5">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 text-accent" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Cashier Slots
            </p>
          </div>
          <p className="mt-2 text-2xl font-heading font-extrabold tracking-tight">
            {cashierCapacity.cashierSlotsAvailable}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cashierCapacity.cashierCount}/{cashierCapacity.cashierLimit} used
            across {cashierCapacity.terminalCount} terminal
            {cashierCapacity.terminalCount === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="glass-card border-white/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Active
          </p>
          <p className="mt-2 text-2xl font-heading font-extrabold tracking-tight text-emerald-500">
            {activeAccounts}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Enabled accounts</p>
        </Card>
        <Card className="glass-card border-white/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Disabled
          </p>
          <p className="mt-2 text-2xl font-heading font-extrabold tracking-tight text-red-500">
            {disabledAccounts}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pending: {pendingAccounts}
          </p>
        </Card>
      </div>

      <Card className="glass-card border-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              My Profile
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xl font-heading font-bold tracking-tight">
                {myAccount.fullName ?? myAccount.email}
              </p>
              <RoleBadge role={myAccount.role} />
              <StatusBadge status={myAccount.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{myAccount.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogState({ type: "self" })}>
              <UserRound className="size-4" />
              Edit My Profile
            </Button>
            <Button
              onClick={() => setDialogState({ type: "create", role: "cashier" })}
              disabled={!canCreateCashier}
            >
              <Plus className="size-4" />
              Create Cashier
            </Button>
            {viewer.role === "admin" ? (
              <Button
                variant="outline"
                onClick={() => setDialogState({ type: "create", role: "manager" })}
              >
                <ShieldCheck className="size-4" />
                Create Manager
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="glass-card border-white/5 p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.keyword}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="Search by name, email, or company..."
              className="pl-9"
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as FiltersState["status"],
              }))
            }
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm lg:col-span-2"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>

          {viewer.role === "admin" ? (
            <>
              <select
                value={filters.role}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    role: event.target.value as FiltersState["role"],
                  }))
                }
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm lg:col-span-2"
              >
                <option value="">All roles</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
              </select>

              <select
                value={filters.companyId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    companyId: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm lg:col-span-2"
              >
                <option value="">All companies</option>
                {companyOptions.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <div className="flex gap-2 lg:col-span-2 lg:justify-end">
            <Button onClick={() => refreshAccounts()} disabled={isPending}>
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const nextFilters: FiltersState = {
                  keyword: "",
                  status: "",
                  role: "",
                  companyId: "",
                };
                setFilters(nextFilters);
                refreshAccounts(nextFilters);
              }}
              disabled={isPending}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass-card overflow-hidden border-white/5">
        {accounts.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-heading font-bold">No accounts found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust the filters or create a new account.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03]">
                  <tr className="border-b border-white/5">
                    {["Account", "Company", "Branch", "Role", "Status", "Actions"].map((label) => (
                      <th
                        key={label}
                        className={`px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground ${
                          label === "Actions" ? "text-right" : ""
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="cursor-pointer hover:bg-white/[0.03]"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold">{account.fullName ?? account.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {account.company.name ?? "Unassigned"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {account.branch.name ?? "No branch"}
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={account.role} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div
                          className="flex justify-end gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {account.canApprove ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                runMutation(async () => {
                                  const result = await approveAccountAction(account.id);
                                  if (result.success) {
                                    toast.success("Account approved");
                                  }
                                  return result;
                                })
                              }
                            >
                              <CheckCircle2 className="size-4" />
                              Approve
                            </Button>
                          ) : null}
                          {account.canActivate ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                runMutation(async () => {
                                  const result = await activateAccountAction(account.id);
                                  if (result.success) {
                                    toast.success("Account activated");
                                  }
                                  return result;
                                })
                              }
                            >
                              <Power className="size-4" />
                              Activate
                            </Button>
                          ) : null}
                          {account.canDeactivate ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                runMutation(async () => {
                                  const result = await deactivateAccountAction(account.id);
                                  if (result.success) {
                                    toast.success("Account deactivated");
                                  }
                                  return result;
                                })
                              }
                            >
                              <Power className="size-4" />
                              Deactivate
                            </Button>
                          ) : null}
                          {account.canEdit ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDialogState({ type: "edit", account })}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                          ) : null}
                          {account.canDelete ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(account)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/accounts/${account.id}`}>Open</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 md:hidden">
              {accounts.map((account) => (
                <Card
                  key={account.id}
                  className="border-white/5 p-4"
                  onClick={() => router.push(`/accounts/${account.id}`)}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold">{account.fullName ?? account.email}</p>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RoleBadge role={account.role} />
                      <StatusBadge status={account.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.company.name ?? "Unassigned"} · {account.branch.name ?? "No branch"}
                    </p>
                    <div
                      className="flex flex-wrap gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {account.canApprove ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            runMutation(async () => {
                              const result = await approveAccountAction(account.id);
                              if (result.success) {
                                toast.success("Account approved");
                              }
                              return result;
                            })
                          }
                        >
                          Approve
                        </Button>
                      ) : null}
                      {account.canActivate ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            runMutation(async () => {
                              const result = await activateAccountAction(account.id);
                              if (result.success) {
                                toast.success("Account activated");
                              }
                              return result;
                            })
                          }
                        >
                          Activate
                        </Button>
                      ) : null}
                      {account.canDeactivate ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            runMutation(async () => {
                              const result = await deactivateAccountAction(account.id);
                              if (result.success) {
                                toast.success("Account deactivated");
                              }
                              return result;
                            })
                          }
                        >
                          Deactivate
                        </Button>
                      ) : null}
                      {account.canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialogState({ type: "edit", account })}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {account.canDelete ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(account)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </Card>

      {renderDialog()}
    </div>
  );
}
