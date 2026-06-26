import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { managementWorkflowService } from "../_services/management-workflow.service";
import { StockAdjustmentForm, StockCountForm, StockDispositionForm } from "../_components/ManagementForms";
import {
  createStockAdjustmentAction,
  createStockCountAction,
  createStockDispositionAction,
  transitionStockCountAction,
} from "../_actions/management-workflow.actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatExpiryDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "No expiry date";
}

function formatExpiryTiming(daysUntilExpiry: number | null) {
  if (daysUntilExpiry === null) return "No expiry date";
  if (daysUntilExpiry < 0) return `${Math.abs(daysUntilExpiry)} days expired`;
  if (daysUntilExpiry === 0) return "Expires today";
  return `${daysUntilExpiry} days left`;
}

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
            <StockCountForm
              products={options.products}
              terminals={options.terminals}
              stockLots={options.stockLots}
              profiles={options.profiles}
              action={createStockCountAction}
            />
            <StockDispositionForm
              products={options.products}
              terminals={options.terminals}
              stockLots={options.stockLots}
              action={createStockDispositionAction}
            />
          </div>
        }
        stats={[
          { label: "Tracked SKUs", value: data.stats.totalTracked },
          { label: "Low Stock", value: data.stats.lowStock },
          { label: "Out of Stock", value: data.stats.outOfStock },
          { label: "No Movement", value: data.stats.noMovement },
          { label: "Restock Picks", value: data.restockRecommendations.length },
          { label: "Expired Lots", value: data.stats.expiredLots },
          { label: "Near Expiry", value: data.stats.nearExpiryLots },
          { label: "Count Review", value: data.stats.pendingStockCounts },
          { label: "Loss Events", value: data.stats.lossEvents },
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
            <h2 className="text-base font-bold tracking-tight">Restock Assistant</h2>
            <p className="text-xs text-muted-foreground">
              Reorder suggestions based on recent sales pace, current stock, and supplier history.
            </p>
          </div>
          <StatusBadge>{data.restockRecommendations.length} recommendations</StatusBadge>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {data.restockRecommendations.slice(0, 8).map((product) => (
            <div key={product.id} className="rounded-md border bg-background p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.categoryName}</div>
                </div>
                <StatusBadge>{product.riskLevel}</StatusBadge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold tabular-nums">{product.averageDailySales}</div>
                  <div className="text-muted-foreground">avg daily sold</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {product.remainingStockDays === null ? "No sales" : `${product.remainingStockDays} days`}
                  </div>
                  <div className="text-muted-foreground">stock left</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {product.recommendedReorderQuantity} {product.baseUnit}
                  </div>
                  <div className="text-muted-foreground">reorder qty</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {formatCurrency(product.estimatedReorderCost)}
                  </div>
                  <div className="text-muted-foreground">est. cost</div>
                </div>
              </div>
              <div className="mt-2 truncate text-xs text-muted-foreground">
                Supplier: {product.supplierName ?? "No supplier history"}
              </div>
            </div>
          ))}
          {data.restockRecommendations.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No restock recommendations right now.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="border-border/80 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight">Physical Count Control</h2>
            <p className="text-xs text-muted-foreground">
              Draft counts, submitted variances, and manager approvals that post adjustment movements.
            </p>
          </div>
          <StatusBadge>{data.stockCountSessions.length} active counts</StatusBadge>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.stockCountSessions.map((session) => (
            <div key={session.id} className="rounded-md border bg-background p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{session.countNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    Assigned: {session.assignedTo}
                  </div>
                </div>
                <StatusBadge>{session.status}</StatusBadge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold tabular-nums">{session.totalVariance}</div>
                  <div className="text-muted-foreground">total variance</div>
                </div>
                <div>
                  <div className="font-semibold">{session.createdBy}</div>
                  <div className="text-muted-foreground">started by</div>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                {session.items.map((item) => (
                  <div key={item.id} className="rounded border bg-muted/20 p-2">
                    <div className="font-semibold">{item.productName}</div>
                    <div className="text-muted-foreground">
                      Expected {item.expectedQuantity} / Counted {item.countedQuantity ?? "-"} / Variance {item.varianceQuantity ?? "-"}
                    </div>
                    <div className="text-muted-foreground">
                      {item.batchNumber ? `Batch ${item.batchNumber}` : "Product total"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                {session.status === "draft" ? (
                  <form action={transitionStockCountAction} className="flex flex-1 gap-2">
                    <input type="hidden" name="stockCountSessionId" value={session.id} />
                    <input type="hidden" name="action" value="submit" />
                    <input
                      name="countedQuantity"
                      type="number"
                      min="0"
                      step="0.0001"
                      required
                      placeholder="Counted"
                      className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                    />
                    <Button type="submit" size="sm" className="h-8">Submit</Button>
                  </form>
                ) : null}
                {session.status === "submitted" ? (
                  <>
                    <form action={transitionStockCountAction}>
                      <input type="hidden" name="stockCountSessionId" value={session.id} />
                      <input type="hidden" name="action" value="approve" />
                      <Button type="submit" size="sm" className="h-8">Approve</Button>
                    </form>
                    <form action={transitionStockCountAction}>
                      <input type="hidden" name="stockCountSessionId" value={session.id} />
                      <input type="hidden" name="action" value="reject" />
                      <Button type="submit" size="sm" variant="outline" className="h-8">Reject</Button>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {data.stockCountSessions.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No active count sessions awaiting work.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="border-border/80 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight">Loss, Damage & Expiry Report</h2>
            <p className="text-xs text-muted-foreground">
              Disposed stock movements grouped by reason with cost and retail impact.
            </p>
          </div>
          <StatusBadge>{data.dispositionEvents.length} recent events</StatusBadge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.dispositionBuckets.map((bucket) => (
            <div key={bucket.reason} className="rounded-md border bg-background p-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {bucket.reason}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums">{bucket.count}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatQuantity(bucket.quantity)} units / {formatCurrency(bucket.costImpact)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.dispositionEvents.map((event) => (
            <div key={event.id} className="rounded-md border bg-background p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{event.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.categoryName} / {event.batchNumber ?? "No batch"}
                  </div>
                </div>
                <StatusBadge>{event.reason}</StatusBadge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold tabular-nums">
                    {formatQuantity(event.quantity)} {event.baseUnit || "units"}
                  </div>
                  <div className="text-muted-foreground">quantity</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">{formatCurrency(event.costImpact)}</div>
                  <div className="text-muted-foreground">cost impact</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">{formatCurrency(event.retailImpact)}</div>
                  <div className="text-muted-foreground">retail impact</div>
                </div>
                <div>
                  <div className="font-semibold">{event.actor}</div>
                  <div className="text-muted-foreground">{event.createdAt.toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mt-2 truncate text-xs text-muted-foreground">
                {event.referenceNumber ?? "No reference"} {event.notes ? `/ ${event.notes}` : ""}
              </div>
            </div>
          ))}
          {data.dispositionEvents.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No damaged, lost, expired, or disposed stock recorded yet.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="border-border/80 p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight">Batch & Expiry Monitor</h2>
            <p className="text-xs text-muted-foreground">
              FEFO priorities for received batches with remaining quantity on hand.
            </p>
          </div>
          <StatusBadge>{data.nearExpiryLots.length} priority lots</StatusBadge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {data.expiryBuckets.map((bucket) => (
            <div key={bucket.key} className="rounded-md border bg-background p-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {bucket.label}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums">{bucket.count}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatQuantity(bucket.quantity)} units / {formatCurrency(bucket.costValue)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.nearExpiryLots.map((lot) => (
            <div key={lot.id} className="rounded-md border bg-background p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{lot.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {lot.categoryName} / {lot.batchNumber ?? "No batch"}
                  </div>
                </div>
                <StatusBadge>{lot.status}</StatusBadge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold tabular-nums">
                    {formatExpiryDate(lot.expiryDate)}
                  </div>
                  <div className="text-muted-foreground">
                    {formatExpiryTiming(lot.daysUntilExpiry)}
                  </div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {formatQuantity(lot.quantity)} {lot.baseUnit || "units"}
                  </div>
                  <div className="text-muted-foreground">on hand</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {formatCurrency(lot.costValue)}
                  </div>
                  <div className="text-muted-foreground">cost value</div>
                </div>
                <div>
                  <div className="truncate font-semibold">
                    {lot.shelfLocation ?? "No shelf"}
                  </div>
                  <div className="text-muted-foreground">shelf</div>
                </div>
              </div>
              <div className="mt-2 truncate text-xs text-muted-foreground">
                Supplier: {lot.supplierName ?? "No supplier linked"}
              </div>
            </div>
          ))}
          {data.nearExpiryLots.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No expired or near-expiry batches with quantity on hand.
            </div>
          ) : null}
        </div>
      </Card>

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
                    {formatCurrency(product.stockValue)}
                  </div>
                  <div className="text-muted-foreground">cost value</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold tabular-nums">
                    {product.remainingStockDays === null ? "No sales" : `${product.remainingStockDays} days`}
                  </div>
                  <div className="text-muted-foreground">stock left</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {product.recommendedReorderQuantity} {product.baseUnit || "units"}
                  </div>
                  <div className="text-muted-foreground">suggested order</div>
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
