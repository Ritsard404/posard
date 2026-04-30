import {
  CalendarDays,
  ClipboardList,
  FileClock,
  ListX,
  Receipt,
  ScanSearch,
  ShieldAlert,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { ReportPrintableView } from "@/app/(protected)/report/_services/_dto/report.dto";

export type ReportsRouteSlug =
  | "sales"
  | "daily-transactions"
  | "debt-outstanding"
  | "debt-collections"
  | "x-reading"
  | "z-reading"
  | "audit-trail"
  | "voided"
  | "discounts"
  | "transaction-list"
  | "sales-book"
  | "refunds"
  | "returned-items"
  | "returned-records";

export type ReportPreset = "today" | "7d" | "30d" | "all" | "custom";

export interface ReportRouteDefinition {
  slug: ReportsRouteSlug;
  view: ReportPrintableView;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  category:
    | "Sales"
    | "Debt"
    | "Operations"
    | "Readings"
    | "Compliance"
    | "Discounts"
    | "Returns";
}

export const REPORT_ROUTE_DEFINITIONS: ReportRouteDefinition[] = [
  {
    slug: "sales",
    view: "transactions",
    label: "Sales Report",
    shortLabel: "Sales",
    description: "Invoice-level sales activity with payment and cashier context.",
    icon: ShoppingBag,
    category: "Sales",
  },
  {
    slug: "daily-transactions",
    view: "daily-transactions",
    label: "Daily Transactions",
    shortLabel: "Daily",
    description: "Daily rollups by date and terminal for fast review.",
    icon: CalendarDays,
    category: "Operations",
  },
  {
    slug: "transaction-list",
    view: "transaction-list",
    label: "Transaction List",
    shortLabel: "Ledger",
    description: "Ledger-style sales, refund, and void entries in one list.",
    icon: ClipboardList,
    category: "Sales",
  },
  {
    slug: "sales-book",
    view: "sales-book",
    label: "Sales Book",
    shortLabel: "Book",
    description: "Daily summarized book for sales, VAT, and totals.",
    icon: Receipt,
    category: "Sales",
  },
  {
    slug: "debt-outstanding",
    view: "debt-outstanding",
    label: "Debt Outstanding",
    shortLabel: "Outstanding",
    description: "Open receivables by customer, terminal, and due date.",
    icon: Receipt,
    category: "Debt",
  },
  {
    slug: "debt-collections",
    view: "debt-collections",
    label: "Debt Collections",
    shortLabel: "Collections",
    description: "Later debt payments grouped separately from original sales.",
    icon: ClipboardList,
    category: "Debt",
  },
  {
    slug: "x-reading",
    view: "x-reading",
    label: "X-Reading",
    shortLabel: "X-Reading",
    description: "Current session reading for terminal-level cash control.",
    icon: ScanSearch,
    category: "Readings",
  },
  {
    slug: "z-reading",
    view: "z-reading",
    label: "Z-Reading",
    shortLabel: "Z-Reading",
    description: "Day-close totals, taxes, and accumulated sales.",
    icon: Receipt,
    category: "Readings",
  },
  {
    slug: "audit-trail",
    view: "audit",
    label: "Audit Trail",
    shortLabel: "Audit",
    description: "Manager approvals and control-sensitive activity.",
    icon: FileClock,
    category: "Compliance",
  },
  {
    slug: "voided",
    view: "voided-list",
    label: "Voided Transactions",
    shortLabel: "Voided",
    description: "Cancelled and voided invoices with item-level detail.",
    icon: ListX,
    category: "Compliance",
  },
  {
    slug: "discounts",
    view: "pwd-list",
    label: "Discount Reports",
    shortLabel: "Discounts",
    description: "Discount-qualified transactions with customer context.",
    icon: ShieldAlert,
    category: "Discounts",
  },
  {
    slug: "refunds",
    view: "refund-invoices",
    label: "Refund Invoices",
    shortLabel: "Refunds",
    description: "Fully and partially refunded invoices.",
    icon: Receipt,
    category: "Returns",
  },
  {
    slug: "returned-items",
    view: "returned-items",
    label: "Returned Items",
    shortLabel: "Items",
    description: "Returned line items across invoices.",
    icon: Receipt,
    category: "Returns",
  },
  {
    slug: "returned-records",
    view: "returned-records",
    label: "Returned Records",
    shortLabel: "Records",
    description: "Refund records with source invoice context.",
    icon: FileClock,
    category: "Returns",
  },
];

export function getReportRouteDefinition(slug: string) {
  return REPORT_ROUTE_DEFINITIONS.find((item) => item.slug === slug);
}

export function getSlugForPrintableView(view: string | null | undefined): ReportsRouteSlug | null {
  const definition = REPORT_ROUTE_DEFINITIONS.find((item) => item.view === view);
  return definition?.slug ?? null;
}
