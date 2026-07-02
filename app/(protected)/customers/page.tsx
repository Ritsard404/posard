import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { remainingFeaturesService } from "../_services/remaining-features.service";
import {
  ManagementFilters,
  RemainingFeatureWorkspace,
  StatusBadge,
} from "../_components/RemainingFeatureWorkspace";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

function date(value: Date | null) {
  return value ? value.toLocaleDateString() : "-";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value) ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function customersPageHref(search: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/customers?${query}` : "/customers";
}

function CustomerPagination({
  pagination,
  search,
}: {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  search?: string;
}) {
  const firstItem =
    pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(
    pagination.totalItems,
    pagination.page * pagination.pageSize,
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background/80 p-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Showing {firstItem.toLocaleString()}-{lastItem.toLocaleString()} of{" "}
        {pagination.totalItems.toLocaleString()} customers
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {pagination.hasPreviousPage ? (
          <Button asChild variant="outline" className="h-12 sm:h-9">
            <Link href={customersPageHref(search, pagination.page - 1)}>
              <ChevronLeft className="size-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="h-12 sm:h-9" disabled>
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        )}
        <Button variant="secondary" className="h-12 sm:h-9" disabled>
          Page {pagination.page.toLocaleString()} of{" "}
          {pagination.totalPages.toLocaleString()}
        </Button>
        {pagination.hasNextPage ? (
          <Button asChild variant="outline" className="h-12 sm:h-9">
            <Link href={customersPageHref(search, pagination.page + 1)}>
              Next
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="h-12 sm:h-9" disabled>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface CustomersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = (await searchParams) ?? {};
  const search = firstParam(params.search)?.trim() || undefined;
  const customers = await remainingFeaturesService.getCustomers({
    search,
    page: positivePage(params.page),
  });

  return (
    <RemainingFeatureWorkspace
      title="Customers & Loyalty"
      description="Customer profiles with debt exposure, loyalty point balances, recent purchase history, and return visibility."
      stats={[
        { label: "Active Customers", value: customers.summary.activeCustomers },
        { label: "Outstanding Debt", value: money(customers.summary.totalOutstanding) },
        { label: "Loyalty Points", value: customers.summary.totalPoints },
        { label: "Lifetime Spend", value: money(customers.summary.totalSpent) },
      ]}
      toolbar={
        <div className="space-y-2">
          <ManagementFilters
            search={customers.filters.search}
            statuses={[]}
            placeholder="Customer, phone, address, notes"
          />
          <CustomerPagination
            pagination={customers.pagination}
            search={customers.filters.search}
          />
        </div>
      }
      items={customers.items}
      emptyText={
        customers.filters.search
          ? "No matching customers found."
          : "No customers recorded yet."
      }
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
