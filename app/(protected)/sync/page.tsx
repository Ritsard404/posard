import { remainingFeaturesService } from "../_services/remaining-features.service";
import {
  ManagementFilters,
  RemainingFeatureWorkspace,
  StatusBadge,
} from "../_components/RemainingFeatureWorkspace";
import { transitionSyncIssueAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkSyncStatusIndicator } from "../pos/_components/NetworkSyncStatusIndicator";

interface SyncCenterPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

const actionLabels: Record<string, string> = {
  PAY_ORDER: "Sale checkout",
  VOID_ORDER: "Void sale",
  WITHDRAW_CASH: "Cash withdrawal",
  CLOSE_SESSION: "Close session",
};

function formatSyncAction(actionType: string) {
  return (
    actionLabels[actionType] ?? actionType.replaceAll("_", " ").toLowerCase()
  );
}

function formatAge(date: Date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function recoveryHint(
  item: Awaited<
    ReturnType<typeof remainingFeaturesService.getSyncIssues>
  >[number],
) {
  if (item.syncStatus === "resolved") return "Recovered";
  if (item.syncStatus === "dismissed") return "Dismissed";
  if (item.conflictCategory === "manager_approval")
    return "Review approval details before retrying.";
  if (item.conflictCategory === "session_recovery")
    return "Verify the terminal session and original device.";
  if (item.conflictCategory === "payment_recovery")
    return "Check invoice and payment references before replay.";
  if (item.conflictCategory === "inventory")
    return "Confirm stock levels before replay.";
  return "Open POS on the original device, then retry sync after review.";
}

export default async function SyncCenterPage({
  searchParams,
}: SyncCenterPageProps) {
  const filters = await searchParams;
  const issues = await remainingFeaturesService.getSyncIssues(filters);
  const needsAttention = issues.filter((issue) =>
    ["failed", "needs_review"].includes(issue.syncStatus),
  ).length;
  const pendingReplay = issues.filter((issue) =>
    ["pending", "syncing"].includes(issue.syncStatus),
  ).length;

  return (
    <RemainingFeatureWorkspace
      title="Offline Sync Center"
      description="Diagnose, retry, review, resolve, or dismiss offline sync issues without blocking checkout."
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <NetworkSyncStatusIndicator />
          <ManagementFilters
            search={filters?.search}
            status={filters?.status}
            statuses={[
              "pending",
              "syncing",
              "failed",
              "needs_review",
              "resolved",
              "dismissed",
            ]}
          />
        </div>
      }
      stats={[
        { label: "Needs review", value: needsAttention },
        { label: "Pending replay", value: pendingReplay },
        { label: "Listed issues", value: issues.length },
      ]}
      items={issues}
      emptyText="No offline sync issues need attention."
      columns={[
        { label: "Action", value: (item) => formatSyncAction(item.actionType) },
        {
          label: "Status",
          value: (item) => <StatusBadge>{item.syncStatus}</StatusBadge>,
        },
        {
          label: "Branch",
          value: (item) =>
            item.branchCode
              ? `${item.branchCode} - ${item.branchName}`
              : item.branchName,
        },
        { label: "Terminal", value: (item) => item.terminalName },
        {
          label: "Local Ref",
          value: (item) => item.idempotencyKey ?? item.localId,
        },
        { label: "Message", value: (item) => item.message },
        { label: "Recovery", value: (item) => recoveryHint(item) },
        { label: "Age", value: (item) => formatAge(item.createdAt) },
        {
          label: "Last update",
          value: (item) => item.updatedAt.toLocaleString(),
        },
        {
          label: "Retries",
          value: (item) =>
            `${item.retryCount}${item.nextRetryAt ? ` / next ${item.nextRetryAt.toLocaleString()}` : ""}`,
        },
        {
          label: "Actions",
          value: (item) => (
            <form
              action={transitionSyncIssueAction}
              className="flex min-w-52 flex-wrap gap-1"
            >
              <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
              <input type="hidden" name="issueId" value={item.id} />
              <Input
                name="notes"
                placeholder="Review note"
                className="h-8 min-w-36 flex-1 text-xs"
                aria-label={`Review note for ${formatSyncAction(item.actionType)}`}
              />
              {["failed", "needs_review", "pending"].includes(
                item.syncStatus,
              ) ? (
                <Button size="sm" name="action" value="retry">
                  Retry
                </Button>
              ) : null}
              {item.syncStatus !== "needs_review" ? (
                <Button
                  size="sm"
                  variant="outline"
                  name="action"
                  value="review"
                >
                  Review
                </Button>
              ) : null}
              {!["resolved", "dismissed"].includes(item.syncStatus) ? (
                <Button
                  size="sm"
                  variant="outline"
                  name="action"
                  value="resolve"
                >
                  Resolve
                </Button>
              ) : null}
              {!["resolved", "dismissed"].includes(item.syncStatus) ? (
                <Button
                  size="sm"
                  variant="outline"
                  name="action"
                  value="dismiss"
                >
                  Dismiss
                </Button>
              ) : null}
            </form>
          ),
        },
      ]}
    />
  );
}
