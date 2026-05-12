import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

export default async function InventoryLedgerPage() {
  const data = await remainingFeaturesService.getInventoryHealth();

  return (
    <RemainingFeatureWorkspace
      title="Inventory Health"
      description="Traceable stock movement history with low, negative, and no-movement indicators."
      stats={[
        { label: "Low Stock", value: data.stats.lowStock },
        { label: "Negative Stock", value: data.stats.negativeStock },
        { label: "No Movement", value: data.stats.noMovement },
      ]}
      items={data.movements}
      emptyText="No stock movement records yet."
      columns={[
        { label: "Product", value: (item) => item.product.name },
        { label: "Type", value: (item) => <StatusBadge>{item.movementType}</StatusBadge> },
        { label: "Change", value: (item) => item.quantityDelta },
        { label: "After", value: (item) => item.quantityAfter ?? "-" },
        { label: "Reference", value: (item) => item.referenceNumber ?? item.sourceType ?? "-" },
        { label: "Date", value: (item) => item.createdAt.toLocaleString() },
      ]}
    />
  );
}
