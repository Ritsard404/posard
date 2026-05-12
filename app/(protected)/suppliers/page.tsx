import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

export default async function SuppliersPage() {
  const suppliers = await remainingFeaturesService.getSuppliers();

  return (
    <RemainingFeatureWorkspace
      title="Suppliers"
      description="Supplier master list for purchase orders, receiving, and supplier history."
      items={suppliers}
      emptyText="No suppliers recorded yet."
      columns={[
        { label: "Supplier", value: (item) => item.name },
        { label: "Contact", value: (item) => item.contactName ?? item.phone ?? item.email ?? "-" },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "POs", value: (item) => item._count.purchaseOrders },
        { label: "Receiving", value: (item) => item._count.receivingRecords },
      ]}
    />
  );
}
