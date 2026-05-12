import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

export default async function CustomersPage() {
  const customers = await remainingFeaturesService.getCustomers();

  return (
    <RemainingFeatureWorkspace
      title="Customers & Loyalty"
      description="Customer profiles with debt exposure and traceable loyalty point balances."
      items={customers}
      emptyText="No customers recorded yet."
      columns={[
        { label: "Customer", value: (item) => item.name },
        { label: "Phone", value: (item) => item.phone ?? "-" },
        { label: "Status", value: (item) => <StatusBadge>{item.isActive ? "active" : "inactive"}</StatusBadge> },
        { label: "Debt", value: (item) => money(item.outstandingDebt) },
        { label: "Points", value: (item) => item.loyaltyPoints },
      ]}
    />
  );
}
