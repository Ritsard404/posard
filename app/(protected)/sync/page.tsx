import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { transitionSyncIssueAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

interface SyncCenterPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

export default async function SyncCenterPage({ searchParams }: SyncCenterPageProps) {
  const filters = await searchParams;
  const issues = await remainingFeaturesService.getSyncIssues(filters);

  return (
    <RemainingFeatureWorkspace
      title="Offline Sync Center"
      description="Diagnose, retry, review, resolve, or dismiss offline sync issues without blocking checkout."
      toolbar={<ManagementFilters search={filters?.search} status={filters?.status} statuses={["pending", "syncing", "failed", "needs_review", "resolved", "dismissed"]} />}
      items={issues}
      emptyText="No offline sync issues need attention."
      columns={[
        { label: "Action", value: (item) => item.actionType },
        { label: "Status", value: (item) => <StatusBadge>{item.syncStatus}</StatusBadge> },
        { label: "Terminal", value: (item) => item.terminalName },
        { label: "Conflict", value: (item) => item.conflictCategory },
        { label: "Message", value: (item) => item.message },
        { label: "Retries", value: (item) => item.retryCount },
        { label: "Next Retry", value: (item) => item.nextRetryAt?.toLocaleString() ?? "-" },
        {
          label: "Actions",
          value: (item) => (
            <form action={transitionSyncIssueAction} className="flex flex-wrap gap-1">
              <input type="hidden" name="issueId" value={item.id} />
              {["failed", "needs_review", "pending"].includes(item.syncStatus) ? <Button size="sm" name="action" value="retry">Retry</Button> : null}
              {item.syncStatus !== "needs_review" ? <Button size="sm" variant="outline" name="action" value="review">Review</Button> : null}
              {!["resolved", "dismissed"].includes(item.syncStatus) ? <Button size="sm" variant="outline" name="action" value="resolve">Resolve</Button> : null}
              {!["resolved", "dismissed"].includes(item.syncStatus) ? <Button size="sm" variant="outline" name="action" value="dismiss">Dismiss</Button> : null}
            </form>
          ),
        },
      ]}
    />
  );
}
