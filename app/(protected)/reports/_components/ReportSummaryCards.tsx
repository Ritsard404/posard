import type {
  AuditTrailDto,
  DebtCollectionsDto,
  DebtOutstandingDto,
  DailyTransactionsDto,
  DiscountReportDto,
  InventoryValueReportDto,
  InvoiceDocumentsDto,
  NonSalesIncomeReportDto,
  ProductProfitReportDto,
  ProductVelocityReportDto,
  RefundInvoicesDto,
  RevenueGoalReportDto,
  ReportOverviewDto,
  ReturnedInvoiceRecordsDto,
  ReturnedItemsDto,
  SalesBookDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "@/app/(protected)/report/_services/_dto/report.dto";
import { SummaryMetric } from "@/app/(protected)/report/_components/ReportListPrimitives";
import type { LoadedReportData } from "../_services/report-page.service";
import type { ReportsRouteSlug } from "./reports-config";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function OverviewSummaryCards({ overview }: { overview: ReportOverviewDto }) {
  const metrics = [
    {
      label: "Total Sales",
      value: formatCurrency(overview.totalSales),
      hint: `${formatSignedPercent(overview.salesChangePercent)} ${overview.salesComparisonLabel}`,
    },
    {
      label: "Expenses",
      value: formatCurrency(overview.totalExpenses),
      hint: "+0.0%",
    },
    {
      label: "Net Profit",
      value: formatCurrency(overview.netProfit),
      hint: `${overview.profitMarginPercent.toFixed(1)}% margin`,
    },
    {
      label: "Transactions",
      value: formatCount(overview.totalTransactions),
      hint: `${formatCurrency(overview.averageTransactionValue)} avg`,
    },
    {
      label: "Composite Sold",
      value: formatCount(overview.totalCompositeSold),
      hint: `${formatCount(overview.compositeNet)} net`,
      subhint: `+${formatCount(overview.compositeProduced)} produced · -${formatCount(
        overview.compositeDisassembled,
      )} disassembled`,
    },
    {
      label: "VAT Collected",
      value: overview.vatCollected === null ? "N/A" : formatCurrency(overview.vatCollected),
      hint: overview.isVatRegistered ? "VAT-registered sales" : "Store is not VAT-registered",
      subhint: overview.isVatRegistered ? "VAT" : "Non-VAT",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-border/70 bg-card px-3 py-2 shadow-sm"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {metric.label}
          </div>
          <div className="mt-1 break-words text-xl font-black tracking-tight text-foreground sm:text-2xl">
            {metric.value}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            {metric.hint}
          </div>
          {metric.subhint ? (
            <div className="mt-0.5 text-[10px] text-muted-foreground/80">
              {metric.subhint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function ReportPageSummaryCards({
  slug,
  overview,
  data,
}: {
  slug: ReportsRouteSlug;
  overview: ReportOverviewDto;
  data: LoadedReportData;
}) {
  const metrics = buildMetrics(slug, overview, data);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <SummaryMetric
          key={metric.label}
          label={metric.label}
          value={metric.value}
          hint={metric.hint}
        />
      ))}
    </div>
  );
}

function buildMetrics(
  slug: ReportsRouteSlug,
  overview: ReportOverviewDto,
  data: LoadedReportData,
): Array<{ label: string; value: string; hint?: string }> {
  switch (slug) {
    case "sales": {
      const report = data as TransactionHistoryDto;
      return [
        { label: "Total Sales", value: formatCurrency(report.totalNetSales) },
        { label: "Transactions", value: formatCount(report.totalTransactions) },
        {
          label: "Average Transaction",
          value: formatCurrency(
            report.totalTransactions > 0
              ? report.totalNetSales / report.totalTransactions
              : 0,
          ),
        },
        { label: "Discounts", value: formatCurrency(report.totalDiscounts) },
      ];
    }
    case "daily-transactions": {
      const report = data as DailyTransactionsDto;
      const totalNet = report.items.reduce((sum, item) => sum + item.netSales, 0);
      return [
        { label: "Days Loaded", value: formatCount(report.items.length) },
        { label: "Net Sales", value: formatCurrency(totalNet) },
        {
          label: "Cash Sales",
          value: formatCurrency(report.items.reduce((sum, item) => sum + item.cashSales, 0)),
        },
        {
          label: "Reference Payments",
          value: formatCurrency(report.items.reduce((sum, item) => sum + item.ePaymentSales, 0)),
        },
      ];
    }
    case "debt-outstanding": {
      const report = data as DebtOutstandingDto;
      return [
        { label: "Outstanding", value: formatCurrency(report.totalOutstanding) },
        { label: "Due Today", value: formatCurrency(report.dueToday) },
        { label: "Overdue", value: formatCurrency(report.overdue) },
        { label: "Accounts", value: formatCount(report.pagination.totalItems) },
      ];
    }
    case "debt-collections": {
      const report = data as DebtCollectionsDto;
      return [
        { label: "Collected", value: formatCurrency(report.totalCollected) },
        { label: "Cash", value: formatCurrency(report.cashCollected) },
        { label: "Reference", value: formatCurrency(report.referenceCollected) },
        { label: "Payments", value: formatCount(report.pagination.totalItems) },
      ];
    }
    case "documents": {
      const report = data as InvoiceDocumentsDto;
      return [
        { label: "Documents", value: formatCount(report.pagination.totalItems) },
        { label: "Invoices", value: formatCount(report.totals.invoice) },
        { label: "X / Z Reports", value: formatCount(report.totals.xReport + report.totals.zReport) },
        { label: "Train Mode", value: formatCount(report.totals.trainMode) },
      ];
    }
    case "transaction-list": {
      const report = data as TransactionListDto;
      return [
        { label: "Gross Sales", value: formatCurrency(report.totals.totalGrossSales) },
        { label: "Returns", value: formatCurrency(report.totals.totalReturns) },
        { label: "Discounts", value: formatCurrency(report.totals.totalDiscounts) },
        { label: "Net Sales", value: formatCurrency(report.totals.totalNetSales) },
      ];
    }
    case "sales-book": {
      const report = data as SalesBookDto;
      return [
        { label: "Gross Sales", value: formatCurrency(report.totals.grossSales) },
        { label: "Discounts", value: formatCurrency(report.totals.totalDiscounts) },
        { label: "Net Sales", value: formatCurrency(report.totals.netSales) },
        { label: "VAT Amount", value: formatCurrency(report.totals.vatAmount) },
      ];
    }
    case "product-profit": {
      const report = data as ProductProfitReportDto;
      return [
        { label: "Revenue", value: formatCurrency(report.totals.revenue) },
        { label: "COGS", value: formatCurrency(report.totals.costOfGoods) },
        { label: "Gross Profit", value: formatCurrency(report.totals.grossProfit) },
        { label: "Margin", value: `${report.totals.grossMarginPercent.toFixed(1)}%` },
      ];
    }
    case "movement-velocity": {
      const report = data as ProductVelocityReportDto;
      return [
        { label: "Fast", value: formatCount(report.totals.fast) },
        { label: "Steady", value: formatCount(report.totals.steady) },
        { label: "Slow/Idle", value: formatCount(report.totals.slow + report.totals.idle) },
        { label: "High Risk", value: formatCount(report.totals.highRisk) },
      ];
    }
    case "inventory-value": {
      const report = data as InventoryValueReportDto;
      return [
        { label: "Cost Value", value: formatCurrency(report.totals.costValue) },
        { label: "Retail Value", value: formatCurrency(report.totals.retailValue) },
        { label: "Potential Profit", value: formatCurrency(report.totals.potentialProfit) },
        { label: "Rows", value: formatCount(report.pagination.totalItems) },
      ];
    }
    case "revenue-goal": {
      const report = data as RevenueGoalReportDto;
      return [
        { label: "Target", value: formatCurrency(report.targetAmount) },
        { label: "Actual", value: formatCurrency(report.actualSales) },
        { label: "Variance", value: formatCurrency(report.varianceAmount) },
        { label: "Progress", value: `${report.progressPercent.toFixed(1)}%` },
      ];
    }
    case "non-sales-income": {
      const report = data as NonSalesIncomeReportDto;
      return [
        { label: "Income", value: formatCurrency(report.totalAmount) },
        { label: "Rows", value: formatCount(report.pagination.totalItems) },
        { label: "Sales", value: formatCurrency(overview.totalSales) },
        { label: "Expenses", value: formatCurrency(overview.totalExpenses) },
      ];
    }
    case "x-reading": {
      const report = data as XReadingDto;
      return [
        { label: "Invoice Count", value: formatCount(report.invoices.length) },
        { label: "Terminal", value: report.terminalName },
        { label: "Cashier", value: report.cashierName },
        { label: "OR Range", value: `${report.beginningOrNumber} - ${report.endingOrNumber}` },
      ];
    }
    case "z-reading": {
      const report = data as ZReadingDto;
      return [
        { label: "Net Sales", value: formatCurrency(report.netSales) },
        { label: "Gross Sales", value: formatCurrency(report.grossSales) },
        { label: "VAT Amount", value: formatCurrency(report.vatAmount) },
        { label: "Present Accumulated", value: formatCurrency(report.presentAccumulatedSales) },
      ];
    }
    case "audit-trail": {
      const report = data as AuditTrailDto;
      return [
        { label: "Events", value: formatCount(report.pagination.totalItems) },
        {
          label: "With Amount",
          value: formatCount(report.items.filter((item) => item.amount !== null).length),
        },
        { label: "Transactions", value: formatCount(overview.totalTransactions) },
        { label: "Total Sales", value: formatCurrency(overview.totalSales) },
      ];
    }
    case "voided": {
      const report = data as VoidedListDto;
      return [
        { label: "Voided Total", value: formatCurrency(report.totals.totalAmountDue) },
        { label: "Gross Sales", value: formatCurrency(report.totals.totalGross) },
        { label: "Discounts", value: formatCurrency(report.totals.totalDiscount) },
        { label: "VAT", value: formatCurrency(report.totals.totalVat) },
      ];
    }
    case "discounts":
    case "senior-discounts":
    case "dswd-discounts": {
      const report = data as DiscountReportDto;
      return [
        { label: "Gross Sales", value: formatCurrency(report.totals.totalGrossSales) },
        { label: "Discounts", value: formatCurrency(report.totals.totalDiscounts) },
        { label: "Net Sales", value: formatCurrency(report.totals.totalNetSales) },
        { label: "Transactions", value: formatCount(report.pagination.totalItems) },
      ];
    }
    case "refunds": {
      const report = data as RefundInvoicesDto;
      return [
        { label: "Refund Amount", value: formatCurrency(report.totalRefundAmount) },
        { label: "Invoices", value: formatCount(report.pagination.totalItems) },
        { label: "Total Sales", value: formatCurrency(overview.totalSales) },
        { label: "Transactions", value: formatCount(overview.totalTransactions) },
      ];
    }
    case "returned-items": {
      const report = data as ReturnedItemsDto;
      return [
        { label: "Return Amount", value: formatCurrency(report.totalReturnAmount) },
        { label: "Items", value: formatCount(report.pagination.totalItems) },
        { label: "Total Sales", value: formatCurrency(overview.totalSales) },
        { label: "Transactions", value: formatCount(overview.totalTransactions) },
      ];
    }
    case "returned-records": {
      const report = data as ReturnedInvoiceRecordsDto;
      return [
        { label: "Returned Amount", value: formatCurrency(report.totalReturnedAmount) },
        { label: "Records", value: formatCount(report.pagination.totalItems) },
        { label: "Voids", value: formatCurrency(overview.totalVoids) },
        { label: "Returns", value: formatCurrency(overview.totalReturns) },
      ];
    }
  }
}
