import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

function date(value: Date | null) {
  return value ? value.toLocaleDateString() : "-";
}

export default async function CustomersPage() {
  const customers = await remainingFeaturesService.getCustomers();
  const activeCustomers = customers.filter((customer) => customer.isActive).length;
  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstandingDebt, 0);
  const totalPoints = customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0);
  const totalSpent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <RemainingFeatureWorkspace
      title="Customers & Loyalty"
      description="Customer profiles with debt exposure, loyalty point balances, recent purchase history, and return visibility."
      stats={[
        { label: "Active Customers", value: activeCustomers },
        { label: "Outstanding Debt", value: money(totalOutstanding) },
        { label: "Loyalty Points", value: totalPoints },
        { label: "Lifetime Spend", value: money(totalSpent) },
      ]}
      items={customers}
      emptyText="No customers recorded yet."
      columns={[
        { label: "Customer", value: (item) => item.name },
        { label: "Phone", value: (item) => item.phone ?? "-" },
        { label: "Status", value: (item) => <StatusBadge>{item.isActive ? "active" : "inactive"}</StatusBadge> },
        { label: "Debt", value: (item) => money(item.outstandingDebt) },
        {
          label: "Loyalty",
          value: (item) => (
            <div>
              <div className="font-semibold tabular-nums">{item.loyaltyPoints} pts</div>
              <div className="text-xs text-muted-foreground">
                {item.loyaltyEvents[0]
                  ? `${item.loyaltyEvents[0].transactionType} ${item.loyaltyEvents[0].pointsDelta} pts`
                  : "No activity"}
              </div>
            </div>
          ),
        },
        {
          label: "Purchases",
          value: (item) => (
            <div>
              <div className="font-semibold">{item.purchaseCount} invoices / {money(item.totalSpent)}</div>
              <div className="text-xs text-muted-foreground">Last {date(item.lastPurchaseAt)}</div>
            </div>
          ),
        },
        {
          label: "Recent History",
          value: (item) => (
            <div className="space-y-1 text-xs">
              {item.recentPurchases.map((purchase) => (
                <div key={purchase.id} className="rounded-md border bg-background px-2 py-1">
                  <div className="font-semibold">#{purchase.invoiceNumber} {money(purchase.totalAmount)}</div>
                  <div className="text-muted-foreground">
                    {purchase.terminalName} / {purchase.status} / {purchase.createdAt.toLocaleDateString()}
                  </div>
                </div>
              ))}
              {item.recentPurchases.length === 0 ? (
                <span className="text-muted-foreground">No matched invoices</span>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
