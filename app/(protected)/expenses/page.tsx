import { remainingFeaturesService } from "../_services/remaining-features.service";
import { RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";

function money(value: unknown) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value ?? 0));
}

export default async function ExpensesPage() {
  const expenses = await remainingFeaturesService.getExpenses();

  return (
    <RemainingFeatureWorkspace
      title="Expense Ledger"
      description="Operational expenses by category, terminal, status, and creator for report integration."
      items={expenses}
      emptyText="No expenses recorded yet."
      columns={[
        { label: "Reference", value: (item) => item.referenceNumber },
        { label: "Date", value: (item) => item.expenseDate.toLocaleDateString() },
        { label: "Category", value: (item) => item.category.name },
        { label: "Amount", value: (item) => money(item.amount) },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "Created By", value: (item) => item.createdBy.fullName ?? item.createdBy.email },
      ]}
    />
  );
}
