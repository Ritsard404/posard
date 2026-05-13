import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { transitionKitchenTicketAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

interface KitchenPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

function elapsed(createdAt: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  return `${minutes} min`;
}

export default async function KitchenPage({ searchParams }: KitchenPageProps) {
  const filters = await searchParams;
  const tickets = await remainingFeaturesService.getKitchenTickets(filters);

  return (
    <RemainingFeatureWorkspace
      title="Kitchen Management"
      description="Run the preparation queue by starting, marking ready, serving, or cancelling kitchen tickets with audit history."
      toolbar={<ManagementFilters search={filters?.search} status={filters?.status} statuses={["queued", "preparing", "ready", "served", "cancelled"]} />}
      items={tickets}
      emptyText="No kitchen tickets recorded yet."
      columns={[
        { label: "Ticket", value: (item) => item.ticketNumber },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Terminal", value: (item) => item.terminal.posName ?? "Unnamed" },
        { label: "Invoice", value: (item) => `#${item.invoice.invoiceNumber}` },
        { label: "Station", value: (item) => item.station ?? "-" },
        { label: "Age", value: (item) => elapsed(item.createdAt) },
        { label: "Updated By", value: (item) => item.updatedBy?.fullName ?? item.updatedBy?.email ?? "-" },
        {
          label: "Actions",
          value: (item) => (
            <form action={transitionKitchenTicketAction} className="flex flex-wrap gap-1">
              <input type="hidden" name="ticketId" value={item.id} />
              {item.status === "queued" ? <Button size="sm" name="action" value="start">Start</Button> : null}
              {item.status === "preparing" ? <Button size="sm" name="action" value="ready">Ready</Button> : null}
              {item.status === "ready" ? <Button size="sm" name="action" value="served">Served</Button> : null}
              {!["served", "cancelled"].includes(item.status) ? <Button size="sm" variant="outline" name="action" value="cancel">Cancel</Button> : null}
            </form>
          ),
        },
      ]}
    />
  );
}
