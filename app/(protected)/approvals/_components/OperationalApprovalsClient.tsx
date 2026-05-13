"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OperationalApprovalListItemDto } from "../_services/_dto/operational-approval.dto";
import {
  approveOperationalApprovalAction,
  rejectOperationalApprovalAction,
} from "../_actions/operational-approval.action";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OperationalApprovalsClient({
  approvals,
}: {
  approvals: OperationalApprovalListItemDto[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  function runDecision(
    id: string,
    task: (
      id: string,
      input: { note?: string },
    ) => Promise<{ success: boolean; error?: string }>,
    message: string,
  ) {
    startTransition(() => {
      void (async () => {
        const result = await task(id, { note: notes[id] });

        if (!result.success) {
          toast.error(result.error ?? "Approval update failed");
          return;
        }

        toast.success(message);
        router.refresh();
      })();
    });
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <div className="border-b px-3 py-3 sm:px-4">
        <h2 className="text-base font-semibold tracking-tight">Operational Approvals</h2>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
          Shared approval inbox for sensitive POS, inventory, expense, and transfer actions.
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No pending operational approvals.
        </div>
      ) : (
        <div className="divide-y">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="grid gap-2 p-3 transition-colors hover:bg-muted/20 lg:grid-cols-[minmax(0,1fr)_240px]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">{approval.referenceNumber}</Badge>
                  <Badge className="h-5 rounded-full px-2 text-[11px]">{approval.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(approval.createdAt)}
                  </span>
                </div>
                <div className="mt-1.5 font-semibold leading-5">{approval.title}</div>
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                  {approval.summary}
                </p>
                <div className="mt-1 text-xs text-muted-foreground">
                  Requested by {approval.requestedByName} for{" "}
                  {approval.targetType}
                  {approval.targetId ? ` ${approval.targetId}` : ""}
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  value={notes[approval.id] ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [approval.id]: event.target.value,
                    }))
                  }
                  placeholder="Decision note"
                  disabled={isPending}
                  className="h-8"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={isPending}
                    onClick={() =>
                      runDecision(
                        approval.id,
                        approveOperationalApprovalAction,
                        "Approval accepted",
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    disabled={isPending}
                    onClick={() =>
                      runDecision(
                        approval.id,
                        rejectOperationalApprovalAction,
                        "Approval rejected",
                      )
                    }
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
