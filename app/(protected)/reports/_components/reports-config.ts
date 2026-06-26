import {
  CalendarDays,
  ClipboardList,
  FileClock,
  FileText,
  ListX,
  Receipt,
  ScanSearch,
  ShieldAlert,
  ShoppingBag,
  Target,
  TrendingUp,
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
  | "senior-discounts"
  | "dswd-discounts"
  | "transaction-list"
  | "sales-book"
  | "product-profit"
  | "movement-velocity"
  | "inventory-value"
  | "revenue-goal"
  | "non-sales-income"
  | "refunds"
  | "returned-items"
  | "returned-records"
  | "documents";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "annual";

export type ReportPreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "all"
  | "custom";

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
    | "Returns"
    | "Documents";
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
    slug: "product-profit",
    view: "product-profit",
    label: "Profit Per Product",
    shortLabel: "Profit",
    description: "Product-level revenue, COGS, gross profit, margin, and markup.",
    icon: TrendingUp,
    category: "Sales",
  },
  {
    slug: "movement-velocity",
    view: "movement-velocity",
    label: "Fast/Slow Moving",
    shortLabel: "Velocity",
    description: "Sale velocity, last sale recency, on-hand stock, and stockout risk.",
    icon: ScanSearch,
    category: "Sales",
  },
  {
    slug: "inventory-value",
    view: "inventory-value",
    label: "Inventory Value",
    shortLabel: "Value",
    description: "Inventory value by category, supplier, shelf, batch, and expiry.",
    icon: ClipboardList,
    category: "Sales",
  },
  {
    slug: "revenue-goal",
    view: "revenue-goal",
    label: "Revenue Goal",
    shortLabel: "Target",
    description: "Monthly revenue target, run-rate, variance, and projection.",
    icon: Target,
    category: "Sales",
  },
  {
    slug: "non-sales-income",
    view: "non-sales-income",
    label: "Non-Sales Income",
    shortLabel: "Income",
    description: "Income outside invoice sales by source, terminal, user, and date.",
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
    slug: "documents",
    view: "invoice-documents",
    label: "Invoice Documents",
    shortLabel: "Documents",
    description: "Archived invoice and reading documents with preview and reprint controls.",
    icon: FileText,
    category: "Documents",
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
    label: "PWD Discount Report",
    shortLabel: "PWD",
    description: "PWD-qualified transactions with customer and ID context.",
    icon: ShieldAlert,
    category: "Discounts",
  },
  {
    slug: "senior-discounts",
    view: "senior-list",
    label: "Senior Discount Report",
    shortLabel: "Senior",
    description: "Senior discount transactions with customer and ID context.",
    icon: ShieldAlert,
    category: "Discounts",
  },
  {
    slug: "dswd-discounts",
    view: "dswd-list",
    label: "DSWD Discount Report",
    shortLabel: "DSWD",
    description: "DSWD discount transactions with customer and ID context.",
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
