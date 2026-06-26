import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileClock,
  ListX,
  Receipt,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShoppingBag,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ReportCategory =
  | "Overview"
  | "Sales Reports"
  | "Debt Reports"
  | "Daily Transactions"
  | "Voids & Returns"
  | "Discount Reports"
  | "Audit Trail"
  | "Readings";

export type ReportPrintableView =
  | "overview"
  | "daily-transactions"
  | "transaction-list"
  | "transactions"
  | "voided-list"
  | "pwd-list"
  | "senior-list"
  | "dswd-list"
  | "sales"
  | "product-profit"
  | "movement-velocity"
  | "inventory-value"
  | "revenue-goal"
  | "non-sales-income"
  | "sales-book"
  | "refund-invoices"
  | "returned-items"
  | "returned-records"
  | "debt-outstanding"
  | "debt-collections"
  | "invoice-documents"
  | "audit"
  | "x-reading"
  | "z-reading";

export type ReportSortOrder = "newest" | "oldest";

export type ReportViewMeta = {
  id: ReportPrintableView;
  category: ReportCategory;
  label: string;
  description: string;
  supportingCopy: string;
  icon: LucideIcon;
};

export const REPORT_VIEWS: ReportViewMeta[] = [
  {
    id: "overview",
    category: "Overview",
    label: "Overview",
    description: "Snapshot of sales and operations.",
    supportingCopy:
      "Start here for a high-level picture before opening a detailed report.",
    icon: BarChart3,
  },
  {
    id: "daily-transactions",
    category: "Daily Transactions",
    label: "Daily Transactions",
    description: "Daily rollups by date and terminal.",
    supportingCopy:
      "Scan daily totals and invoice counts without opening the full ledger.",
    icon: CalendarDays,
  },
  {
    id: "transaction-list",
    category: "Sales Reports",
    label: "Transaction List",
    description: "Ledger view with base, void, and refund entries.",
    supportingCopy: "Review mixed transaction activity in posting order.",
    icon: ClipboardList,
  },
  {
    id: "transactions",
    category: "Sales Reports",
    label: "Sales History",
    description: "Invoice-level sales and payment history.",
    supportingCopy:
      "Inspect invoice records with payment and cashier context.",
    icon: ShoppingBag,
  },
  {
    id: "voided-list",
    category: "Voids & Returns",
    label: "Voided List",
    description: "Cancelled and voided invoice records.",
    supportingCopy: "Review sales that were cancelled before settlement.",
    icon: ListX,
  },
  {
    id: "pwd-list",
    category: "Discount Reports",
    label: "PWD List",
    description: "Transactions with PWD discount application.",
    supportingCopy: "Filter discount usage for PWD-qualified invoices.",
    icon: ShieldAlert,
  },
  {
    id: "senior-list",
    category: "Discount Reports",
    label: "Senior List",
    description: "Transactions with senior discount application.",
    supportingCopy:
      "Review senior discount transactions and amounts applied.",
    icon: ShieldAlert,
  },
  {
    id: "dswd-list",
    category: "Discount Reports",
    label: "DSWD List",
    description: "Transactions with DSWD discount application.",
    supportingCopy:
      "Review DSWD discount transactions and amounts applied.",
    icon: ShieldAlert,
  },
  {
    id: "sales",
    category: "Sales Reports",
    label: "Sales Report",
    description: "Item-level sales and profitability.",
    supportingCopy:
      "Break down sold items by revenue and profit contribution.",
    icon: CreditCard,
  },
  {
    id: "product-profit",
    category: "Sales Reports",
    label: "Profit Per Product",
    description: "Product-level revenue, COGS, profit, margin, and markup.",
    supportingCopy:
      "Compare which products create profit, not only sales volume.",
    icon: TrendingUp,
  },
  {
    id: "movement-velocity",
    category: "Sales Reports",
    label: "Fast/Slow Moving",
    description: "Sale velocity, last sale, on-hand stock, and stockout risk.",
    supportingCopy:
      "Identify fast movers, slow movers, idle products, and replenishment risk.",
    icon: ScanSearch,
  },
  {
    id: "inventory-value",
    category: "Sales Reports",
    label: "Inventory Value",
    description: "Stock value by category, supplier, shelf, batch, and expiry.",
    supportingCopy:
      "Review cost value, retail value, and potential profit in on-hand stock.",
    icon: ClipboardList,
  },
  {
    id: "revenue-goal",
    category: "Sales Reports",
    label: "Revenue Goal",
    description: "Monthly target progress and projected month-end sales.",
    supportingCopy:
      "Track variance, daily run-rate, and required sales pace against target.",
    icon: Target,
  },
  {
    id: "non-sales-income",
    category: "Sales Reports",
    label: "Non-Sales Income",
    description: "Income outside invoice sales, grouped by source and date.",
    supportingCopy:
      "Track rebates, service income, deposits, and other income without changing sales totals.",
    icon: CreditCard,
  },
  {
    id: "sales-book",
    category: "Sales Reports",
    label: "Sales Book",
    description: "Daily summarized sales book.",
    supportingCopy:
      "Use the day-by-day book when you need summarized reporting.",
    icon: Receipt,
  },
  {
    id: "refund-invoices",
    category: "Voids & Returns",
    label: "Refund Invoices",
    description: "Fully and partially refunded invoices.",
    supportingCopy:
      "Trace refunded invoices without mixing them into normal sales views.",
    icon: RotateCcw,
  },
  {
    id: "returned-items",
    category: "Voids & Returns",
    label: "Returned Items",
    description: "Returned line items across invoices.",
    supportingCopy:
      "Inspect item-level returns across the selected report range.",
    icon: RotateCcw,
  },
  {
    id: "returned-records",
    category: "Voids & Returns",
    label: "Returned Records",
    description: "Returned invoice records with transaction context.",
    supportingCopy:
      "Open return history with the original transaction details attached.",
    icon: FileClock,
  },
  {
    id: "debt-outstanding",
    category: "Debt Reports",
    label: "Debt Outstanding",
    description: "Open receivables by customer and due date.",
    supportingCopy:
      "Track balances still unpaid without mixing them into settled sales totals.",
    icon: CreditCard,
  },
  {
    id: "debt-collections",
    category: "Debt Reports",
    label: "Debt Collections",
    description: "Collected debt payments by date, method, and cashier.",
    supportingCopy:
      "Review receivable collections separately from original invoice issuance.",
    icon: Receipt,
  },
  {
    id: "audit",
    category: "Audit Trail",
    label: "Audit Trail",
    description: "Manager approvals and session events.",
    supportingCopy:
      "Track approvals, role actions, and other control-sensitive events.",
    icon: FileClock,
  },
  {
    id: "x-reading",
    category: "Readings",
    label: "X-Reading",
    description: "Latest session summary.",
    supportingCopy:
      "Check the current session totals before end-of-day close.",
    icon: ScanSearch,
  },
  {
    id: "z-reading",
    category: "Readings",
    label: "Z-Reading",
    description: "End-of-day totals and taxes.",
    supportingCopy:
      "Use the final day-close report for totals, taxes, and closures.",
    icon: Receipt,
  },
];

export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "Overview",
  "Sales Reports",
  "Debt Reports",
  "Daily Transactions",
  "Voids & Returns",
  "Discount Reports",
  "Audit Trail",
  "Readings",
];

export const REPORT_CATEGORY_DESCRIPTIONS: Record<ReportCategory, string> = {
  Overview: "Quick summary before drilling into detailed activity.",
  "Sales Reports":
    "Invoice history, sales performance, and day-by-day sales summaries.",
  "Debt Reports":
    "Receivable balances and later collections without rewriting sales settlement history.",
  "Daily Transactions":
    "Daily terminal rollups for fast closeout and day review.",
  "Voids & Returns":
    "Exceptions, cancelled sales, refunds, and returned item activity.",
  "Discount Reports":
    "Qualified discount transactions for PWD, senior, and DSWD reporting.",
  "Audit Trail":
    "Manager approvals, control events, and other sensitive actions.",
  Readings: "Shift and end-of-day reading views for operational control.",
};

export function getReportViewGroups() {
  return REPORT_CATEGORY_ORDER.map((category) => ({
    category,
    description: REPORT_CATEGORY_DESCRIPTIONS[category],
    views: REPORT_VIEWS.filter((view) => view.category === category),
  })).filter((group) => group.views.length > 0);
}

export function supportsReportSort(view: ReportPrintableView) {
  return view !== "overview" && view !== "z-reading" && view !== "invoice-documents";
}
