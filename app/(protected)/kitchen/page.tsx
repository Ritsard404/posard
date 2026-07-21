import { remainingFeaturesService } from "../_services/remaining-features.service";
import {
  ManagementFilters,
  RemainingFeatureWorkspace,
  StatusBadge,
} from "../_components/RemainingFeatureWorkspace";
import { transitionKitchenTicketAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KitchenPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

function elapsed(createdAt: Date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 60000),
  );
  return `${minutes} min`;
}

function ageTone(createdAt: Date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 60000),
  );
  if (minutes >= 30) return "urgent";
  if (minutes >= 15) return "watch";
  return "normal";
}

export default async function KitchenPage({ searchParams }: KitchenPageProps) {
  const filters = await searchParams;
  const tickets = await remainingFeaturesService.getKitchenTickets(filters);
  const openTickets = tickets.filter((ticket) =>
    ["queued", "preparing", "ready"].includes(ticket.status),
  );
  const urgentTickets = openTickets.filter(
    (ticket) => ageTone(ticket.createdAt) === "urgent",
  ).length;
  const readyTickets = tickets.filter(
    (ticket) => ticket.status === "ready",
  ).length;

  return (
    <RemainingFeatureWorkspace
      title="Kitchen Management"
      description="Run the preparation queue by starting, marking ready, serving, or cancelling kitchen tickets with audit history."
      toolbar={
        <ManagementFilters
          search={filters?.search}
          status={filters?.status}
          statuses={["queued", "preparing", "ready", "served", "cancelled"]}
        />
      }
      stats={[
        { label: "Open Tickets", value: openTickets.length },
        { label: "Ready", value: readyTickets },
        { label: "Over 30 Min", value: urgentTickets },
      ]}
      items={tickets}
      emptyText="No kitchen tickets recorded yet."
      columns={[
        { label: "Ticket", value: (item) => item.ticketNumber },
        {
          label: "Status",
          value: (item) => <StatusBadge>{item.status}</StatusBadge>,
        },
        {
          label: "Terminal",
          value: (item) => item.terminal.posName ?? "Unnamed",
        },
        {
          label: "Invoice",
          value: (item) =>
            item.invoice
              ? `#${item.invoice.invoiceNumber} / ${item.invoice.fulfillmentType}`
              : "Invoice unavailable",
        },
        {
          label: "Item",
          value: (item) => (
            <div>
              <div className="font-semibold">
                {item.item?.product.name ?? "Whole order"}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.item
                  ? `Qty ${Number(item.item.qty)}`
                  : "All prepared items"}
                {item.item?.specialInstructions
                  ? ` / ${item.item.specialInstructions}`
                  : ""}
              </div>
            </div>
          ),
        },
        { label: "Station", value: (item) => item.station ?? "-" },
        {
          label: "Age",
          value: (item) => (
            <span
              className={
                ageTone(item.createdAt) === "urgent"
                  ? "font-semibold text-destructive"
                  : ""
              }
            >
              {elapsed(item.createdAt)}
            </span>
          ),
        },
        { label: "Notes", value: (item) => item.notes ?? "-" },
        {
          label: "Updated By",
          value: (item) =>
            item.updatedBy?.fullName ?? item.updatedBy?.email ?? "-",
        },
        {
          label: "Actions",
          value: (item) => (
            <form
              action={transitionKitchenTicketAction}
              className="flex min-w-56 flex-wrap gap-1"
            >
              <input type="hidden" name="ticketId" value={item.id} />
              <Input
                name="notes"
                placeholder="Handoff note"
                className="h-8 min-w-36 flex-1 text-xs"
              />
              {item.status === "queued" ? (
                <Button size="sm" name="action" value="start">
                  Start
                </Button>
              ) : null}
              {item.status === "preparing" ? (
                <Button size="sm" name="action" value="ready">
                  Ready
                </Button>
              ) : null}
              {item.status === "ready" ? (
                <Button size="sm" name="action" value="served">
                  Served
                </Button>
              ) : null}
              {!["served", "cancelled"].includes(item.status) ? (
                <Button
                  size="sm"
                  variant="outline"
                  name="action"
                  value="cancel"
                >
                  Cancel
                </Button>
              ) : null}
            </form>
          ),
        },
      ]}
    />
  );
}
