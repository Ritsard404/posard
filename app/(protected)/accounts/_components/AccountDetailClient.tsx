"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Power,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountDialog } from "./AccountDialog";
import type {
  AccountCompanyOptionDto,
  AccountDetailDto,
  AccountsViewerDto,
} from "../_services/_dto/accounts.dto";
import {
  activateAccountAction,
  approveAccountAction,
  deactivateAccountAction,
  deleteAccountAction,
  updateAccountAction,
  updateOwnAccountProfileAction,
} from "../_actions/accounts.action";

interface AccountDetailClientProps {
  viewer: AccountsViewerDto;
  account: AccountDetailDto;
  companyOptions: AccountCompanyOptionDto[];
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function AccountDetailClient({
  viewer,
  account,
  companyOptions,
}: AccountDetailClientProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(account);
  const [dialogMode, setDialogMode] = useState<"edit" | "self" | null>(null);
  const [isPending, startTransition] = useTransition();
  const backHref = viewer.role === "cashier" ? "/dashboard" : "/accounts";

  function runMutation(task: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(() => {
      void (async () => {
        const result = await task();

        if (!result.success) {
          toast.error(result.error ?? "Request failed");
          return;
        }

        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="px-0">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {viewer.role === "cashier" ? "Back to Dashboard" : "Back to Accounts"}
            </Link>
          </Button>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">
            {detail.fullName ?? detail.email}
          </h1>
          <p className="text-muted-foreground">{detail.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {detail.isSelf ? (
            <Button onClick={() => setDialogMode("self")}>
              <UserRound className="size-4" />
              Edit My Profile
            </Button>
          ) : null}
          {detail.canEdit ? (
            <Button variant="outline" onClick={() => setDialogMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {detail.canApprove ? (
            <Button
              variant="outline"
              onClick={() =>
                runMutation(async () => {
                  const result = await approveAccountAction(detail.id);
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
          {detail.canActivate ? (
            <Button
              variant="outline"
              onClick={() =>
                runMutation(async () => {
                  const result = await activateAccountAction(detail.id);
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
          {detail.canDeactivate ? (
            <Button
              variant="outline"
              onClick={() =>
                runMutation(async () => {
                  const result = await deactivateAccountAction(detail.id);
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
          {detail.canDelete ? (
            <Button
              variant="destructive"
              onClick={() => {
                if (!window.confirm(`Delete ${detail.email}? This cannot be undone.`)) {
                  return;
                }

                runMutation(async () => {
                  const result = await deleteAccountAction(detail.id);
                  if (result.success) {
                    toast.success("Account deleted");
                    router.push("/accounts");
                  }
                  return result;
                });
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailPill label="Role" value={detail.role} />
        <DetailPill label="Status" value={detail.status} />
        <DetailPill label="Company" value={detail.company.name ?? "Unassigned"} />
        <DetailPill
          label="Approved"
          value={detail.approvedAt ? detail.approvedAt.toLocaleString() : "Not yet"}
        />
      </div>

      <Card className="glass-card border-white/5 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Profile
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Full Name</dt>
                <dd className="mt-1 font-semibold">
                  {detail.fullName ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Email</dt>
                <dd className="mt-1 font-semibold">{detail.email}</dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Audit
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1 font-semibold">
                  {detail.createdAt.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Updated</dt>
                <dd className="mt-1 font-semibold">
                  {detail.updatedAt.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      {dialogMode === "edit" ? (
        <AccountDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode(null);
            }
          }}
          mode="edit"
          isPending={isPending}
          title={`Edit ${detail.role} account`}
          description="Update the account profile, company assignment, or login password."
          viewerRole={viewer.role}
          companyOptions={companyOptions}
          initialValues={{
            fullName: detail.fullName,
            companyId: detail.company.id,
          }}
          onEditSubmit={(values) => {
            startTransition(() => {
              void (async () => {
                const result = await updateAccountAction(detail.id, values);

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                setDetail(result.data);
                toast.success("Account updated");
                setDialogMode(null);
                router.refresh();
              })();
            });
          }}
        />
      ) : null}

      {dialogMode === "self" ? (
        <AccountDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode(null);
            }
          }}
          mode="self"
          isPending={isPending}
          title="Update My Profile"
          description="Edit your profile information or change your login password."
          viewerRole={viewer.role}
          companyOptions={companyOptions}
          initialValues={{
            email: detail.email,
            fullName: detail.fullName,
          }}
          onSelfSubmit={(values) => {
            startTransition(() => {
              void (async () => {
                const result = await updateOwnAccountProfileAction(values);

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                setDetail(result.data);
                toast.success(
                  values.email
                    ? "Verification link sent to the new email"
                    : "Profile updated",
                );
                setDialogMode(null);
                router.refresh();
              })();
            });
          }}
        />
      ) : null}
    </div>
  );
}
