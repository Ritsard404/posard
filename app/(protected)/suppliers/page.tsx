import { remainingFeaturesService } from "../_services/remaining-features.service";
import { ManagementFilters, RemainingFeatureWorkspace, StatusBadge } from "../_components/RemainingFeatureWorkspace";
import { SupplierForm } from "../_components/ManagementForms";
import { archiveSupplierAction, upsertSupplierAction } from "../_actions/management-workflow.actions";
import { Button } from "@/components/ui/button";

interface SuppliersPageProps {
  searchParams?: Promise<{ search?: string; status?: string }>;
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const filters = await searchParams;
  const suppliers = await remainingFeaturesService.getSuppliers(filters);

  return (
    <RemainingFeatureWorkspace
      title="Suppliers"
      description="Managed supplier master records for purchase orders, receiving, purchasing history, and vendor analysis."
      toolbar={
        <div className="space-y-2">
          <ManagementFilters search={filters?.search} status={filters?.status} statuses={["active", "inactive"]} />
          <SupplierForm action={upsertSupplierAction} />
        </div>
      }
      items={suppliers}
      emptyText="No suppliers recorded yet."
      columns={[
        { label: "Supplier", value: (item) => item.name },
        { label: "Contact", value: (item) => item.contactName ?? item.phone ?? item.email ?? "-" },
        { label: "Status", value: (item) => <StatusBadge>{item.status}</StatusBadge> },
        { label: "POs", value: (item) => item._count.purchaseOrders },
        { label: "Receiving", value: (item) => item._count.receivingRecords },
        { label: "Notes", value: (item) => item.notes ?? item.address ?? "-" },
        {
          label: "Actions",
          value: (item) =>
            item.status === "active" ? (
              <form action={archiveSupplierAction}>
                <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                <input type="hidden" name="supplierId" value={item.id} />
                <Button size="sm" variant="outline">Archive</Button>
              </form>
            ) : "-",
        },
      ]}
    />
  );
}
