import type {
  AuditTrailDto,
  DebtCollectionsDto,
  DebtOutstandingDto,
  DailyTransactionsDto,
  DiscountReportDto,
  RefundInvoicesDto,
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
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      <SummaryMetric label="Total Sales" value={formatCurrency(overview.totalSales)} />
      <SummaryMetric label="Transactions" value={formatCount(overview.totalTransactions)} />
      <SummaryMetric label="Cash Sales" value={formatCurrency(overview.totalCashSales)} />
      <SummaryMetric
        label="Reference Payments"
        value={formatCurrency(overview.totalEPaymentSales)}
      />
    </div>
  );
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
    case "discounts": {
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
