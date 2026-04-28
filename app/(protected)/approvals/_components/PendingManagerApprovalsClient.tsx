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
} from "../_actions/registration-approval.action";

interface PendingManagerApprovalsClientProps {
  accounts: RegistrationApprovalListItemDto[];
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
  accounts,
}: PendingManagerApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const rejectTarget = useMemo(
    () => accounts.find((account) => account.id === rejectTargetId) ?? null,
    [accounts, rejectTargetId],
  );

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
      <div className="space-y-6">
        <Card className="p-5">
          <h1 className="text-2xl font-bold">Pending Registration Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review merchant onboarding requests before creating Supabase Auth users.
          </p>
        </Card>

        <Card className="overflow-hidden">
          {accounts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No pending registration requests.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
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
                          className={`px-4 py-3 text-left font-medium text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{account.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {account.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {account.companyName ?? "Not provided"}
                        </td>
                        <td className="px-4 py-3">
                          {account.phone ?? "Not provided"}
                        </td>
                        <td className="px-4 py-3">
                          {formatRequestedRole(account.requestedRole)}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(account.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() =>
                                runMutation(
                                  () =>
                                    approveRegistrationRequestAction(account.id),
                                  "Registration request approved",
                                )
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
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

              <div className="space-y-3 p-4 md:hidden">
                {accounts.map((account) => (
                  <Card key={account.id} className="p-4">
                    <div className="space-y-3">
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
                          disabled={isPending}
                          onClick={() =>
                            runMutation(
                              () =>
                                approveRegistrationRequestAction(account.id),
                              "Registration request approved",
                            )
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
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
      </div>

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
