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
    <Card className="overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Operational Approvals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared approval inbox for sensitive POS, inventory, expense, and transfer actions.
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No pending operational approvals.
        </div>
      ) : (
        <div className="divide-y">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="grid gap-3 p-4 lg:grid-cols-[1fr_260px]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{approval.referenceNumber}</Badge>
                  <Badge>{approval.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(approval.createdAt)}
                  </span>
                </div>
                <div className="mt-2 font-semibold">{approval.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {approval.summary}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
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
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
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
