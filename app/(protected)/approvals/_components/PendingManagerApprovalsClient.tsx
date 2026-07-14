"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegistrationApprovalListItemDto } from "../_services/_dto/registration-approval.dto";
import {
  approveRegistrationRequestAction,
  rejectRegistrationRequestAction,
  unlockRejectedRegistrationRequestAction,
} from "../_actions/registration-approval.action";

interface PendingManagerApprovalsClientProps {
  pendingAccounts: RegistrationApprovalListItemDto[];
  rejectedAccounts: RegistrationApprovalListItemDto[];
}

function formatRequestedRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PendingManagerApprovalsClient({
  pendingAccounts,
  rejectedAccounts,
}: PendingManagerApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const approveTarget = useMemo(
    () =>
      pendingAccounts.find((account) => account.id === approveTargetId) ?? null,
    [pendingAccounts, approveTargetId],
  );

  const rejectTarget = useMemo(
    () =>
      pendingAccounts.find((account) => account.id === rejectTargetId) ?? null,
    [pendingAccounts, rejectTargetId],
  );

  const formatRetryStatus = (account: RegistrationApprovalListItemDto) => {
    if (!account.canRegisterAgainAt) {
      return "Retry date unavailable";
    }

    if (account.retryUnlockedAt) {
      return `Re-registration allowed since ${formatDate(account.retryUnlockedAt)}`;
    }

    return `Locked until ${formatDate(account.canRegisterAgainAt)}`;
  };

  function runMutation(
    task: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) {
    startTransition(() => {
      void (async () => {
        const result = await task();
        if (!result.success) {
          toast.error(result.error ?? "Request failed");
          return;
        }

        toast.success(successMessage);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <div className="space-y-3">
        <Card className="border-border/80 p-3 shadow-sm sm:p-4">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">Pending Registration Requests</h1>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
            Review merchant onboarding requests before creating Supabase Auth users.
          </p>
        </Card>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          {pendingAccounts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pending registration requests.
            </div>
          ) : (
            <>
              <div className="hidden max-h-[calc(100vh-14rem)] overflow-auto md:block">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                    <tr className="border-b">
                      {[
                        "Requester",
                        "Company",
                        "Contact",
                        "Role",
                        "Submitted",
                        "Actions",
                      ].map((label) => (
                        <th
                          key={label}
                          className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAccounts.map((account) => (
                      <tr key={account.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{account.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {account.email}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {account.companyName ?? "Not provided"}
                        </td>
                        <td className="px-3 py-2">
                          {account.phone ?? "Not provided"}
                        </td>
                        <td className="px-3 py-2">
                          {formatRequestedRole(account.requestedRole)}
                        </td>
                        <td className="px-3 py-2">
                          {formatDate(account.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={isPending}
                              onClick={() => {
                                setApproveTargetId(account.id);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8"
                              disabled={isPending}
                              onClick={() => {
                                setRejectTargetId(account.id);
                                setRejectionReason("");
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-2 md:hidden">
                {pendingAccounts.map((account) => (
                  <Card key={account.id} className="border-border/80 p-2.5 shadow-sm">
                    <div className="space-y-2">
                      <div>
                        <div className="font-semibold">{account.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.email}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {account.companyName ?? "No company name provided"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {account.phone ?? "No phone provided"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Requested role: {formatRequestedRole(account.requestedRole)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Submitted {formatDate(account.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={isPending}
                          onClick={() => {
                            setApproveTargetId(account.id);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          disabled={isPending}
                          onClick={() => {
                            setRejectTargetId(account.id);
                            setRejectionReason("");
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <div className="border-b px-3 py-3 sm:px-4">
            <h2 className="text-base font-semibold tracking-tight">Rejected Requests</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
              Rejected emails are blocked from re-registering for 7 days unless an admin allows it sooner.
            </p>
          </div>

          {rejectedAccounts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No rejected registration requests.
            </div>
          ) : (
            <>
              <div className="hidden max-h-[calc(100vh-14rem)] overflow-auto md:block">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                    <tr className="border-b">
                      {[
                        "Requester",
                        "Company",
                        "Rejected",
                        "Retry Status",
                        "Reason",
                        "Actions",
                      ].map((label) => (
                        <th
                          key={label}
                          className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedAccounts.map((account) => (
                      <tr key={account.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{account.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {account.email}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {account.companyName ?? "Not provided"}
                        </td>
                        <td className="px-3 py-2">
                          {account.reviewedAt ? formatDate(account.reviewedAt) : "Not recorded"}
                        </td>
                        <td className="px-3 py-2">
                          {formatRetryStatus(account)}
                        </td>
                        <td className="px-3 py-2">
                          {account.rejectionReason ?? "No reason provided"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={isPending || account.retryUnlockedAt !== null}
                              onClick={() =>
                                runMutation(
                                  () =>
                                    unlockRejectedRegistrationRequestAction(
                                      account.id,
                                    ),
                                  "Re-registration allowed",
                                )
                              }
                            >
                              {account.retryUnlockedAt ? "Unlocked" : "Allow Re-registration"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-2 md:hidden">
                {rejectedAccounts.map((account) => (
                  <Card key={account.id} className="border-border/80 p-2.5 shadow-sm">
                    <div className="space-y-2">
                      <div>
                        <div className="font-semibold">{account.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.email}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {account.companyName ?? "No company name provided"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Rejected {account.reviewedAt ? formatDate(account.reviewedAt) : "Not recorded"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatRetryStatus(account)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Reason: {account.rejectionReason ?? "No reason provided"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={isPending || account.retryUnlockedAt !== null}
                          onClick={() =>
                            runMutation(
                              () =>
                                unlockRejectedRegistrationRequestAction(
                                  account.id,
                                ),
                              "Re-registration allowed",
                            )
                          }
                        >
                          {account.retryUnlockedAt ? "Unlocked" : "Allow Re-registration"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Dialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTargetId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Registration Request</DialogTitle>
            <DialogDescription>
              {approveTarget
                ? `Approve ${approveTarget.fullName} and email them a secure password setup link.`
                : "Approve this request and email a secure password setup link."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The user will choose their own password. No password is created or shared by the admin.
          </p>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setApproveTargetId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!approveTarget || isPending}
              onClick={() => {
                if (!approveTarget) {
                  return;
                }

                runMutation(
                  () => approveRegistrationRequestAction(approveTarget.id),
                  "Registration request approved",
                );
                setApproveTargetId(null);
              }}
            >
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTargetId(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Registration Request</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Reject ${rejectTarget.fullName}'s registration request.`
                : "Reject this registration request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
            <Input
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Incomplete business details"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectTargetId(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectTarget || isPending}
              onClick={() => {
                if (!rejectTarget) {
                  return;
                }

                runMutation(
                  () =>
                    rejectRegistrationRequestAction(rejectTarget.id, {
                      rejectionReason,
                    }),
                  "Registration request rejected",
                );
                setRejectTargetId(null);
                setRejectionReason("");
              }}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
