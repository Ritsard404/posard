"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TerminalRequestDTO } from "../_services/terminal-request.dto";

interface TerminalRequestListProps {
  requests: TerminalRequestDTO[];
  isLoading?: boolean;
  role: "admin" | "manager";
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onFulfill?: (requestId: string) => void;
}

export function TerminalRequestList({
  requests,
  isLoading = false,
  role,
  onApprove,
  onReject,
  onFulfill,
}: TerminalRequestListProps) {
  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Terminal Requests</h2>
          <p className="text-sm text-muted-foreground">
            {role === "admin"
              ? "Review pending terminal demand for this company."
              : "Track the requests you have submitted to admin."}
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          No requests yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {request.requestedTerminals} terminal{request.requestedTerminals === 1 ? "" : "s"}
                  </p>
                  <StatusPill status={request.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Requested by {request.requestedByName ?? "Unknown"} on{" "}
                  {request.createdAt.toLocaleDateString()}
                </p>
                {request.reviewedByName ? (
                  <p className="text-sm text-muted-foreground">
                    Last reviewed by {request.reviewedByName} on{" "}
                    {request.reviewedAt?.toLocaleDateString() ?? "n/a"}
                  </p>
                ) : null}
                {request.notes ? <p className="text-sm text-muted-foreground">{request.notes}</p> : null}
              </div>

              {role === "admin" && (request.status === "pending" || request.status === "approved") ? (
                <div className="flex flex-wrap gap-2">
                  {onApprove && request.status === "pending" ? (
                    <Button variant="outline" onClick={() => onApprove(request.id)}>
                      Approve
                    </Button>
                  ) : null}
                  {onFulfill ? (
                    <Button onClick={() => onFulfill(request.id)}>Fulfill</Button>
                  ) : null}
                  {onReject && request.status === "pending" ? (
                    <Button variant="outline" onClick={() => onReject(request.id)}>
                      Reject
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatusPill({
  status,
}: {
  status: "pending" | "approved" | "fulfilled" | "rejected" | "cancelled";
}) {
  const classes = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-sky-200 bg-sky-50 text-sky-700",
    fulfilled: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
    cancelled: "border-zinc-200 bg-zinc-100 text-zinc-700",
  } satisfies Record<typeof status, string>;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${classes[status]}`}
    >
      {status}
    </span>
  );
}
