import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

export default async function TransfersPage() {
  const transfers = await remainingFeaturesService.getTransfers();

  return (
    <RemainingFeatureWorkspace
      title="Branch Transfers"
      description="Auditable terminal-to-terminal transfer lifecycle with source, destination, and quantities."
      items={transfers}
      emptyText="No branch transfers recorded yet."
      columns={[
        { label: "Transfer", value: (item) => item.transferNumber },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Source", value: (item) => item.sourceTerminal.posName ?? "Unnamed" },
        { label: "Destination", value: (item) => item.destinationTerminal.posName ?? "Unnamed" },
        { label: "Items", value: (item) => item.items.length },
        { label: "Requested By", value: (item) => item.requestedBy.fullName ?? item.requestedBy.email },
      ]}
    />
  );
}
