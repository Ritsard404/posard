import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { managementWorkflowService } from "../_services/management-workflow.service";
import { TransferForm } from "../_components/ManagementForms";
import { createTransferAction, transitionTransferAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

interface TransfersPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

export default async function TransfersPage({ searchParams }: TransfersPageProps) {
  const filters = await searchParams;
  const [transfers, options] = await Promise.all([
    remainingFeaturesService.getTransfers(filters),
    managementWorkflowService.getFormOptions(),
  ]);

  return (
    <RemainingFeatureWorkspace
      title="Branch Transfer Management"
      description="Request, approve, dispatch, receive, and trace terminal-to-terminal stock movement with discrepancy visibility."
      toolbar={
        <div className="space-y-2">
          <ManagementFilters
            search={filters?.search}
            status={filters?.status}
            statuses={["draft", "pending_approval", "approved", "dispatched", "in_transit", "partially_received", "received", "cancelled", "disputed"]}
          />
          <TransferForm
            products={options.products}
            terminals={options.terminals}
            action={createTransferAction}
          />
        </div>
      }
      items={transfers}
      emptyText="No branch transfers recorded yet."
      columns={[
        { label: "Transfer", value: (item) => item.transferNumber },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Source", value: (item) => item.sourceTerminal.posName ?? "Unnamed" },
        { label: "Destination", value: (item) => item.destinationTerminal.posName ?? "Unnamed" },
        { label: "Items", value: (item) => item.items.map((line) => `${line.product.name}: ${Number(line.receivedQuantity ?? 0)}/${Number(line.requestedQuantity)}`).join(", ") },
        { label: "Requested By", value: (item) => item.requestedBy.fullName ?? item.requestedBy.email },
        {
          label: "Actions",
          value: (item) => (
            <form action={transitionTransferAction} className="flex flex-wrap gap-1">
              <input type="hidden" name="transferId" value={item.id} />
              {item.status === "pending_approval" ? <Button size="sm" name="action" value="approve">Approve</Button> : null}
              {item.status === "approved" ? <Button size="sm" name="action" value="dispatch">Dispatch</Button> : null}
              {item.status === "in_transit" ? (
                <>
                  <input name="receivedQuantity" type="number" min="0" step="0.0001" placeholder="Qty" className="h-8 w-20 rounded-md border bg-background px-2 text-sm" />
                  <Button size="sm" name="action" value="receive">Receive</Button>
                </>
              ) : null}
              {!["received", "cancelled"].includes(item.status) ? <Button size="sm" variant="outline" name="action" value="cancel">Cancel</Button> : null}
            </form>
          ),
        },
      ]}
    />
  );
}
