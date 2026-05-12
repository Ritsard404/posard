import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

function total(items: Array<{ quantity: unknown; unitCost: unknown }>) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unitCost ?? 0), 0),
  );
}

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await remainingFeaturesService.getPurchaseOrders();

  return (
    <RemainingFeatureWorkspace
      title="Purchase Orders"
      description="Procurement requests with status, supplier, expected date, and order totals."
      items={purchaseOrders}
      emptyText="No purchase orders recorded yet."
      columns={[
        { label: "PO Number", value: (item) => item.poNumber },
        { label: "Supplier", value: (item) => item.supplier.name },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Expected", value: (item) => item.expectedAt?.toLocaleDateString() ?? "-" },
        { label: "Total", value: (item) => total(item.items) },
      ]}
    />
  );
}
