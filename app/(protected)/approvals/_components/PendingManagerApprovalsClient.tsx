"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AccountListItemDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import { approveAccountAction, deactivateAccountAction } from "@/app/(protected)/accounts/_actions/accounts.action";

interface PendingManagerApprovalsClientProps {
  accounts: AccountListItemDto[];
}

export function PendingManagerApprovalsClient({ accounts }: PendingManagerApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runMutation(task: () => Promise<{ success: boolean; error?: string }>, successMessage: string) {
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
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="text-2xl font-bold">Pending Manager Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review manager registrations. Company approval is no longer part of this workflow.
        </p>
      </Card>

      <Card className="overflow-hidden">
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No pending manager registrations.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    {["Manager", "Company", "Status", "Actions"].map((label) => (
                      <th key={label} className={`px-4 py-3 text-left font-medium text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{account.fullName ?? account.email}</div>
                        <div className="text-xs text-muted-foreground">{account.email}</div>
                      </td>
                      <td className="px-4 py-3">{account.company.name ?? "Unassigned"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {account.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/accounts/${account.id}`}>Open</Link>
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => runMutation(() => approveAccountAction(account.id), "Manager approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => runMutation(() => deactivateAccountAction(account.id), "Manager rejected")}
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
                      <div className="font-semibold">{account.fullName ?? account.email}</div>
                      <div className="text-xs text-muted-foreground">{account.email}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{account.company.name ?? "Unassigned"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/accounts/${account.id}`}>Open</Link>
                      </Button>
                      <Button size="sm" disabled={isPending} onClick={() => runMutation(() => approveAccountAction(account.id), "Manager approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => runMutation(() => deactivateAccountAction(account.id), "Manager rejected")}>
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
  );
}
