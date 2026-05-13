import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { managementWorkflowService } from "../_services/management-workflow.service";
import { StockAdjustmentForm } from "../_components/ManagementForms";
import { createStockAdjustmentAction } from "../_actions/management-workflow.actions";

interface InventoryLedgerPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

export default async function InventoryLedgerPage({ searchParams }: InventoryLedgerPageProps) {
  const filters = await searchParams;
  const [data, options] = await Promise.all([
    remainingFeaturesService.getInventoryHealth(filters),
    managementWorkflowService.getFormOptions(),
  ]);

  return (
    <RemainingFeatureWorkspace
      title="Inventory Management"
      description="Traceable stock movement ledger, health indicators, and controlled stock adjustment workflow."
      toolbar={
        <div className="space-y-2">
          <ManagementFilters
            search={filters?.search}
            status={filters?.status}
            statuses={["opening_balance", "stock_in", "stock_out", "sale_deduction", "return_in", "return_out", "adjustment", "transfer_out", "transfer_in", "waste", "receiving_variance"]}
          />
          <StockAdjustmentForm
            products={options.products}
            terminals={options.terminals}
            action={createStockAdjustmentAction}
          />
        </div>
      }
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
        { label: "Before", value: (item) => item.quantityBefore ?? "-" },
        { label: "After", value: (item) => item.quantityAfter ?? "-" },
        { label: "Source", value: (item) => item.referenceNumber ?? item.sourceType ?? "-" },
        { label: "Actor", value: (item) => item.createdBy?.fullName ?? item.createdBy?.email ?? "-" },
        { label: "Date", value: (item) => item.createdAt.toLocaleString() },
      ]}
    />
  );
}
