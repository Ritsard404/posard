import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

export default async function SyncCenterPage() {
  const issues = await remainingFeaturesService.getSyncIssues();

  return (
    <RemainingFeatureWorkspace
      title="Offline Sync Center"
      description="Review failed, pending, and needs-review offline POS actions without blocking checkout."
      items={issues}
      emptyText="No offline sync issues need attention."
      columns={[
        { label: "Action", value: (item) => item.actionType },
        { label: "Status", value: (item) => <StatusBadge>{item.syncStatus}</StatusBadge> },
        { label: "Terminal", value: (item) => item.terminalName },
        { label: "Conflict", value: (item) => item.conflictCategory },
        { label: "Message", value: (item) => item.message },
        { label: "Retries", value: (item) => item.retryCount },
      ]}
    />
  );
}
