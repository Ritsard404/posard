import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { managementWorkflowService } from "../_services/management-workflow.service";
import { ExpenseForm, NonSalesIncomeForm } from "../_components/ManagementForms";
import { createExpenseAction, createNonSalesIncomeAction, transitionExpenseAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

function money(value: unknown) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value ?? 0));
}

interface ExpensesPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const filters = await searchParams;
  const [expenses, incomes, options] = await Promise.all([
    remainingFeaturesService.getExpenses(filters),
    remainingFeaturesService.getNonSalesIncomes(filters),
    managementWorkflowService.getFormOptions(),
  ]);

  return (
    <div className="space-y-6">
      <RemainingFeatureWorkspace
        title="Expense Management"
        description="Create, submit, approve, reject, cancel, and post non-sales spending without changing sales totals."
        toolbar={
          <div className="space-y-2">
            <ManagementFilters
              search={filters?.search}
              status={filters?.status}
              statuses={["draft", "pending_approval", "approved", "rejected", "posted", "cancelled"]}
            />
            <ExpenseForm
              categories={options.categories}
              terminals={options.terminals}
              action={createExpenseAction}
            />
          </div>
        }
        items={expenses}
        emptyText="No expenses recorded yet."
        columns={[
          { label: "Reference", value: (item) => item.referenceNumber },
          { label: "Date", value: (item) => item.expenseDate.toLocaleDateString() },
          { label: "Category", value: (item) => item.category.name },
          { label: "Amount", value: (item) => money(item.amount) },
          { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
          { label: "Created By", value: (item) => item.createdBy.fullName ?? item.createdBy.email },
          { label: "Approved By", value: (item) => item.approvedBy?.fullName ?? item.approvedBy?.email ?? "-" },
          {
            label: "Actions",
            value: (item) => (
              <form action={transitionExpenseAction} className="flex flex-wrap gap-1">
                <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                <input type="hidden" name="expenseId" value={item.id} />
                {item.status === "draft" ? <Button size="sm" name="action" value="submit">Submit</Button> : null}
                {item.status === "pending_approval" ? <Button size="sm" name="action" value="approve">Approve</Button> : null}
                {item.status === "pending_approval" ? <Button size="sm" variant="outline" name="action" value="reject">Reject</Button> : null}
                {item.status === "approved" ? <Button size="sm" name="action" value="post">Post</Button> : null}
                {!["posted", "cancelled"].includes(item.status) ? <Button size="sm" variant="outline" name="action" value="cancel">Cancel</Button> : null}
              </form>
            ),
          },
        ]}
      />

      <RemainingFeatureWorkspace
        title="Non-Sales Income"
        description="Track income that should not be mixed into invoice sales, such as service fees, rebates, rental income, or other deposits."
        toolbar={
          <div className="space-y-2">
            <ManagementFilters search={filters?.search} status={undefined} statuses={[]} />
            <NonSalesIncomeForm terminals={options.terminals} action={createNonSalesIncomeAction} />
          </div>
        }
        items={incomes}
        emptyText="No non-sales income recorded yet."
        columns={[
          { label: "Reference", value: (item) => item.referenceNumber },
          { label: "Date", value: (item) => item.incomeDate.toLocaleDateString() },
          { label: "Source", value: (item) => item.source },
          { label: "Amount", value: (item) => money(item.amount) },
          { label: "External Ref", value: (item) => item.externalReference ?? "-" },
          { label: "Terminal", value: (item) => item.terminal?.posName ?? "Company" },
          { label: "Created By", value: (item) => item.createdBy.fullName ?? item.createdBy.email },
          { label: "Notes", value: (item) => item.notes ?? "-" },
        ]}
      />
    </div>
  );
}
