import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

export default async function KitchenPage() {
  const tickets = await remainingFeaturesService.getKitchenTickets();

  return (
    <RemainingFeatureWorkspace
      title="Kitchen Workflow"
      description="Restaurant-mode preparation queue for queued, preparing, ready, served, and cancelled tickets."
      items={tickets}
      emptyText="No kitchen tickets recorded yet."
      columns={[
        { label: "Ticket", value: (item) => item.ticketNumber },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Terminal", value: (item) => item.terminal.posName ?? "Unnamed" },
        { label: "Invoice", value: (item) => `#${item.invoice.invoiceNumber}` },
        { label: "Station", value: (item) => item.station ?? "-" },
        { label: "Created", value: (item) => item.createdAt.toLocaleString() },
      ]}
    />
  );
}
