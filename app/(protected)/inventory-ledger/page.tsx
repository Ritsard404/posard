import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { managementWorkflowService } from "../_services/management-workflow.service";
import { StockAdjustmentForm } from "../_components/ManagementForms";
import { createStockAdjustmentAction } from "../_actions/management-workflow.actions";
import { Card } from "@/components/ui/card";

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
    <div className="space-y-3">
      <RemainingFeatureWorkspace
        title="Inventory Health"
        description="Traceable stock movement ledger, health indicators, reorder watchlist, and controlled stock adjustment workflow."
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
          { label: "Tracked SKUs", value: data.stats.totalTracked },
          { label: "Low Stock", value: data.stats.lowStock },
          { label: "Out of Stock", value: data.stats.outOfStock },
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

      <Card className="border-border/80 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight">Stock Watchlist</h2>
            <p className="text-xs text-muted-foreground">
              Products that need reorder, count verification, or initial stock movement.
            </p>
          </div>
          <StatusBadge>{data.stats.negativeStock} negative stock</StatusBadge>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {data.watchlist.map((product) => (
            <div key={product.id} className="rounded-md border bg-background p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.categoryName}</div>
                </div>
                <StatusBadge>{product.health}</StatusBadge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold tabular-nums">{product.quantity}</div>
                  <div className="text-muted-foreground">{product.baseUnit || "units"} on hand</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(product.stockValue)}
                  </div>
                  <div className="text-muted-foreground">cost value</div>
                </div>
              </div>
              <div className="mt-2 truncate text-xs text-muted-foreground">
                Last move: {product.lastMovementAt ? `${product.lastMovementType} ${product.lastMovementAt.toLocaleDateString()}` : "none"}
              </div>
            </div>
          ))}
          {data.watchlist.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No low-stock or stale tracked products.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
