import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { managementWorkflowService } from "../_services/management-workflow.service";
import { PurchaseOrderForm } from "../_components/ManagementForms";
import {
  createPurchaseOrderAction,
  receivePurchaseOrderAction,
  transitionPurchaseOrderAction,
} from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

function total(items: Array<{ quantity: unknown; unitCost: unknown }>) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unitCost ?? 0), 0),
  );
}

interface PurchaseOrdersPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

export default async function PurchaseOrdersPage({ searchParams }: PurchaseOrdersPageProps) {
  const filters = await searchParams;
  const [purchaseOrders, options] = await Promise.all([
    remainingFeaturesService.getPurchaseOrders(filters),
    managementWorkflowService.getFormOptions(),
  ]);

  return (
    <RemainingFeatureWorkspace
      title="Purchase Order Management"
      description="Create draft POs, submit and approve purchasing, receive items, and update stock only on confirmed receiving."
      toolbar={
        <div className="space-y-2">
          <ManagementFilters
            search={filters?.search}
            status={filters?.status}
            statuses={["draft", "submitted", "approved", "ordered", "partially_received", "fully_received", "cancelled"]}
          />
          <PurchaseOrderForm
            suppliers={options.suppliers}
            products={options.products}
            action={createPurchaseOrderAction}
          />
        </div>
      }
      items={purchaseOrders}
      emptyText="No purchase orders recorded yet."
      columns={[
        { label: "PO Number", value: (item) => item.poNumber },
        { label: "Supplier", value: (item) => item.supplier.name },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Expected", value: (item) => item.expectedAt?.toLocaleDateString() ?? "-" },
        { label: "Total", value: (item) => total(item.items) },
        {
          label: "Lines",
          value: (item) => item.items.map((line) => `${line.product.name}: ${Number(line.receivedQuantity)}/${Number(line.quantity)}`).join(", "),
        },
        {
          label: "Actions",
          value: (item) => (
            <div className="space-y-2">
              <form action={transitionPurchaseOrderAction} className="flex flex-wrap gap-1">
                <input type="hidden" name="purchaseOrderId" value={item.id} />
                {item.status === "draft" ? <Button size="sm" name="action" value="submit">Submit</Button> : null}
                {item.status === "submitted" ? <Button size="sm" name="action" value="approve">Approve</Button> : null}
                {item.status === "approved" ? <Button size="sm" name="action" value="mark_ordered">Ordered</Button> : null}
                {!["fully_received", "cancelled"].includes(item.status) ? <Button size="sm" variant="outline" name="action" value="cancel">Cancel</Button> : null}
              </form>
              {["approved", "ordered", "partially_received"].includes(item.status) && item.items[0] ? (
                <form action={receivePurchaseOrderAction} className="flex flex-wrap gap-1">
                  <input type="hidden" name="purchaseOrderId" value={item.id} />
                  <input type="hidden" name="purchaseOrderItemId" value={item.items[0].id} />
                  <input name="quantityReceived" type="number" min="0.0001" step="0.0001" placeholder="Qty" className="h-8 w-20 rounded-md border bg-background px-2 text-sm" />
                  <Button size="sm">Receive</Button>
                </form>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
