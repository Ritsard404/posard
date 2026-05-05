import { Badge } from "@/components/ui/badge";
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
  SalesReportDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "../_services/_dto/report.dto";
import { AuditEventLog } from "./AuditEventLog";
import { ReportInvoicePrintButton } from "./ReportInvoicePrintButton";
import { formatInvoiceNumber } from "@/app/(protected)/pos/_services/print-format.service";
import {
  EmptyState,
  ReportField,
  ReportFieldList,
  ReportListCard,
  ReportSectionCard,
  ReportSummaryStrip,
} from "./ReportListPrimitives";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function OverviewPanel({ overview }: { overview: ReportOverviewDto }) {
  return (
    <div className="space-y-4">
      <ReportSummaryStrip
        metrics={[
          { label: "Net Sales", value: formatCurrency(overview.totalSales) },
          { label: "Transactions", value: String(overview.totalTransactions) },
          { label: "Cash Sales", value: formatCurrency(overview.totalCashSales) },
          {
            label: "Reference Payments",
            value: formatCurrency(overview.totalEPaymentSales),
          },
          { label: "Returns", value: formatCurrency(overview.totalReturns) },
          { label: "Voids", value: formatCurrency(overview.totalVoids) },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ReportSectionCard
          title="Payment Breakdown"
          description="Sales by non-cash payment method."
          badge="Summary"
        >
          {overview.paymentBreakdown.length === 0 ? (
            <EmptyState
              title="No reference payment activity"
              message="No reference payment activity was found for this date range."
            />
          ) : (
            overview.paymentBreakdown.map((payment) => (
              <ReportListCard
                key={payment.name}
                title={payment.name}
                subtitle={`${payment.count} transaction${payment.count === 1 ? "" : "s"}`}
                value={formatCurrency(payment.amount)}
              />
            ))
          )}
        </ReportSectionCard>

        <ReportSectionCard
          title="Operational Flags"
          description="Live indicators tied to the selected reporting scope."
          badge="Status"
        >
          <ReportSummaryStrip
            metrics={[
              { label: "Active Sessions", value: String(overview.activeSessionCount) },
              { label: "Unread Invoices", value: String(overview.unreadInvoiceCount) },
              {
                label: "Pending Terminal Requests",
                value: String(overview.pendingTerminalRequests),
              },
            ]}
          />
        </ReportSectionCard>
      </div>
    </div>
  );
}

export function XReadingPanel({ reading }: { reading: XReadingDto }) {
  return (
    <div className="space-y-4">
      <ReportSummaryStrip
        metrics={[
          { label: "Terminal", value: reading.terminalName },
          { label: "Cashier", value: reading.cashierName },
          { label: "Session Invoices", value: String(reading.invoices.length) },
          { label: "OR Range", value: `${reading.beginningOrNumber} - ${reading.endingOrNumber}` },
        ]}
      />

      <ReportSectionCard
        title="Session Details"
        description={`${formatDateTime(reading.range.from)} to ${formatDateTime(reading.range.to)}`}
        badge="X-Reading"
      >
        <ReportFieldList>
          <ReportField label="Business" value={reading.businessName} />
          <ReportField label="Terminal" value={reading.terminalName} />
          <ReportField label="Cashier" value={reading.cashierName} />
          <ReportField label="Operator" value={reading.operatorName} />
          <ReportField label="Address" value={reading.addressLine} />
          <ReportField label="VAT / TIN" value={reading.vatRegTin || "N/A"} />
          <ReportField label="MIN" value={reading.minNumber || "N/A"} />
          <ReportField label="Serial" value={reading.serialNumber || "N/A"} />
          <ReportField label="Opening Fund" value={formatCurrency(reading.openingFund)} />
          <ReportField label="Withdrawal" value={formatCurrency(reading.withdrawalAmount)} />
          <ReportField label="Cash In Drawer" value={formatCurrency(reading.actualCash)} />
        </ReportFieldList>
      </ReportSectionCard>

      <ReportSectionCard
        title="Session Invoices"
        description={`Invoices recorded for this terminal session. Each invoice can be previewed or reprinted individually.`}
        badge="Invoices"
      >
        {reading.invoices.length === 0 ? (
          <EmptyState
            title="No session invoices"
            message="No invoices were recorded for this X-reading session."
          />
        ) : (
          reading.invoices.map((invoice) => (
            <ReportListCard
              key={invoice.invoiceId}
              title={`#${formatInvoiceNumber(invoice.invoiceNumber)}`}
              subtitle={`${formatDateTime(invoice.createdAt)} / ${invoice.terminalName} / ${invoice.cashierName}`}
              badges={<Badge variant="secondary" className="rounded-full uppercase">{invoice.status}</Badge>}
              value={formatCurrency(invoice.totalAmount)}
              meta={
                <>
                  <ReportField label="Customer" value={invoice.customerName || "Walk-in"} />
                  <ReportField label="Cash" value={formatCurrency(invoice.cashCollected)} />
                  <ReportField label="Reference" value={formatCurrency(invoice.referencePaymentAmount)} />
                  <ReportField label="Discount" value={formatCurrency(invoice.discountAmount)} />
                  <ReportField label="Returned" value={formatCurrency(invoice.returnedAmount)} />
                </>
              }
              actions={
                <ReportInvoicePrintButton
                  invoiceId={invoice.invoiceId}
                  invoiceNumber={invoice.invoiceNumber}
                />
              }
            />
          ))
        )}
      </ReportSectionCard>
    </div>
  );
}

export function ZReadingPanel({ reading }: { reading: ZReadingDto }) {
  return (
    <div className="space-y-4">
      <ReportSummaryStrip
        metrics={[
          { label: "Net Sales", value: formatCurrency(reading.netSales) },
          { label: "Gross Sales", value: formatCurrency(reading.grossSales) },
          { label: "Cash Sales", value: formatCurrency(reading.cashSales) },
          {
            label: "Reference Payments",
            value: formatCurrency(reading.ePaymentSales),
          },
        ]}
      />

      <ReportSectionCard
        title="Z-Reading Summary"
        description={`${reading.terminalName} / ${formatDate(reading.range.from)} to ${formatDate(reading.range.to)}`}
        badge="Z-Reading"
      >
        <ReportSummaryStrip
          metrics={[
            { label: "Vatable Sales", value: formatCurrency(reading.vatableSales) },
            { label: "VAT Amount", value: formatCurrency(reading.vatAmount) },
            { label: "Returns", value: formatCurrency(reading.totalReturns) },
            { label: "Voids", value: formatCurrency(reading.totalVoids) },
          ]}
        />
      </ReportSectionCard>
    </div>
  );
}

export function DailyTransactionsPanel({ report }: { report: DailyTransactionsDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No daily transactions"
        message="No daily transactions were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Daily Transactions"
      description="Daily sales rollups by date and terminal."
      badge="Daily"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={`${item.businessDate.toISOString()}-${item.terminalName}`}
          title={`${formatDate(item.businessDate)} / ${item.terminalName}`}
          subtitle={`${item.invoiceCount} invoice${item.invoiceCount === 1 ? "" : "s"}`}
          value={formatCurrency(item.netSales)}
          meta={
            <>
              <ReportField label="Gross Sales" value={formatCurrency(item.grossSales)} />
            </>
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function DebtOutstandingPanel({ report }: { report: DebtOutstandingDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No outstanding debt"
        message="No debt balances were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Debt Outstanding"
      description="Invoice-linked receivables that remain unpaid or partially paid."
      badge="Debt"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={item.debtId}
          title={`#${formatInvoiceNumber(item.invoiceNumber)} / ${item.customerName}`}
          subtitle={`${formatDateTime(item.createdAt)} / ${item.terminalName} / ${item.createdByName}`}
          badges={<Badge variant="secondary" className="rounded-full uppercase">{item.status}</Badge>}
          value={formatCurrency(item.remainingAmount)}
          meta={
            <>
              <ReportField label="Original" value={formatCurrency(item.originalAmount)} />
              <ReportField label="Paid" value={formatCurrency(item.paidAmount)} />
              <ReportField label="Due Date" value={formatDateTime(item.dueDate)} />
            </>
          }
          actions={
            <ReportInvoicePrintButton
              invoiceId={item.invoiceId}
              invoiceNumber={item.invoiceNumber}
            />
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function DebtCollectionsPanel({ report }: { report: DebtCollectionsDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No debt collections"
        message="No debt payments were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Debt Collections"
      description="Later payments collected against previously issued utang."
      badge="Collections"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={item.paymentId}
          title={`#${formatInvoiceNumber(item.invoiceNumber)} / ${item.customerName}`}
          subtitle={`${formatDateTime(item.createdAt)} / ${item.terminalName} / ${item.receivedByName}`}
          badges={<Badge variant="outline" className="rounded-full uppercase">{item.method}</Badge>}
          value={formatCurrency(item.amount)}
          meta={
            <>
              <ReportField label="Remaining" value={formatCurrency(item.remainingAmount)} />
              {item.referenceNo ? (
                <ReportField label="Reference" value={item.referenceNo} />
              ) : null}
            </>
          }
          actions={
            <ReportInvoicePrintButton
              invoiceId={item.invoiceId}
              invoiceNumber={item.invoiceNumber}
            />
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function TransactionsPanel({ history }: { history: TransactionHistoryDto }) {
  if (history.items.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        message="No transactions were found for this date range and terminal scope."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Transaction History"
      description={`Invoice-level activity in the selected scope. ${history.totalTransactions} matching transaction${history.totalTransactions === 1 ? "" : "s"}.`}
      badge="Invoices"
    >
      {history.items.map((item) => (
        <ReportListCard
          key={item.invoiceId}
          title={`#${formatInvoiceNumber(item.invoiceNumber)}`}
          subtitle={`${formatDateTime(item.createdAt)} / ${item.terminalName} / ${item.cashierName}`}
          badges={<Badge variant="secondary" className="rounded-full uppercase">{item.status}</Badge>}
          value={formatCurrency(item.totalAmount)}
          actions={
            <ReportInvoicePrintButton
              invoiceId={item.invoiceId}
              invoiceNumber={item.invoiceNumber}
            />
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function TransactionListPanel({ report }: { report: TransactionListDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No ledger entries found"
        message="No transaction list entries were found for the current filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Transaction List"
      description="Sales, voids, and refunds in ledger order."
      badge="Ledger"
    >
      {report.items.map((item, index) => (
        <ReportListCard
          key={`${item.invoiceId}-${item.source}-${index}`}
          title={`#${formatInvoiceNumber(item.invoiceNumber)}`}
          subtitle={`${formatDateTime(item.entryDate)} / ${item.terminalName} / ${item.cashierName}`}
          badges={
            <>
              <Badge variant="outline" className="rounded-full uppercase">{item.source}</Badge>
              <Badge variant="secondary" className="rounded-full uppercase">{item.status}</Badge>
            </>
          }
          value={formatCurrency(item.netOfSales)}
          meta={<ReportField label="Gross Sales" value={formatCurrency(item.grossSales)} />}
          actions={
            <ReportInvoicePrintButton
              invoiceId={item.invoiceId}
              invoiceNumber={item.invoiceNumber}
            />
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function AuditPanel({ audit }: { audit: AuditTrailDto }) {
  if (audit.items.length === 0) {
    return (
      <EmptyState
        title="No audit events"
        message="No audit events were found for the current filters."
      />
    );
  }

  return <AuditEventLog audit={audit} />;
}

export function SalesPanel({ report }: { report: SalesReportDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No sales lines"
        message="No sales items were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Sales Lines"
      description={`Item-level sales and return impact. ${report.pagination.totalItems} matching line item${report.pagination.totalItems === 1 ? "" : "s"}.`}
      badge="Sales"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={`${item.invoiceId}-${item.itemId}`}
          title={item.itemName}
          subtitle={`Invoice #${formatInvoiceNumber(item.invoiceNumber)} / ${formatDate(item.invoiceDate)} / ${item.itemGroup || "Uncategorized"}`}
          value={formatCurrency(item.revenue)}
          meta={<ReportField label="Profit" value={formatCurrency(item.profit)} />}
        />
      ))}
    </ReportSectionCard>
  );
}

export function SalesBookPanel({ report }: { report: SalesBookDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No sales book rows"
        message="No sales book rows were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Sales Book"
      description="Daily summarized book of sales activity."
      badge="Book"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={`${item.businessDate.toISOString()}-${item.terminalName}`}
          title={`${formatDate(item.businessDate)} / ${item.terminalName}`}
          subtitle={`${item.invoiceCount} invoice${item.invoiceCount === 1 ? "" : "s"}`}
          value={formatCurrency(item.netSales)}
          meta={<ReportField label="VAT Amount" value={formatCurrency(item.vatAmount)} />}
        />
      ))}
    </ReportSectionCard>
  );
}

export function VoidedListPanel({ report }: { report: VoidedListDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No voided invoices"
        message="No voided invoices were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Voided List"
      description="Voided and cancelled invoice records."
      badge="Voids"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={item.invoiceId}
          title={`#${formatInvoiceNumber(item.invoiceNumber)}`}
          subtitle={`${formatDateTime(item.voidedDate)} / ${item.terminalName} / ${item.cashierName}`}
          value={formatCurrency(item.amountDue)}
          meta={
            <>
              <ReportField label="Gross Sales" value={formatCurrency(item.grossSales)} />
              {item.cancelledBy ? (
                <ReportField label="Cancelled By" value={item.cancelledBy} />
              ) : null}
            </>
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function DiscountReportPanel({ report }: { report: DiscountReportDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title={`No ${report.type} transactions`}
        message={`No ${report.type} transactions were found for the selected filters.`}
      />
    );
  }

  return (
    <ReportSectionCard
      title={`${report.type} List`}
      description="Discount-qualified transaction list."
      badge="Discount"
    >
      {report.items.map((item, index) => (
        <ReportListCard
          key={`${item.invoiceId}-${index}`}
          title={`#${formatInvoiceNumber(item.invoiceNumber)}`}
          subtitle={`${formatDateTime(item.entryDate)} / ${item.customerName}`}
          value={formatCurrency(item.netOfSales)}
          meta={<ReportField label="Discount" value={formatCurrency(item.lessDiscount)} />}
        />
      ))}
    </ReportSectionCard>
  );
}

export function RefundInvoicesPanel({ report }: { report: RefundInvoicesDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No refunded invoices"
        message="No refunded invoices were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Refund Invoices"
      description="Fully and partially refunded invoice records."
      badge="Refunds"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={item.invoiceId}
          title={`#${formatInvoiceNumber(item.invoiceNumber)}`}
          subtitle={`Txn ${formatDateTime(item.transactionDate)} / Refund ${formatDateTime(item.refundDate)}`}
          badges={
            <Badge
              variant={item.isFullRefund ? "secondary" : "outline"}
              className="rounded-full uppercase"
            >
              {item.isFullRefund ? "Full Return" : "Partial Return"}
            </Badge>
          }
          value={formatCurrency(item.returnedAmount)}
          meta={<ReportField label="Original Amount" value={formatCurrency(item.totalAmount)} />}
          actions={
            <ReportInvoicePrintButton
              invoiceId={item.invoiceId}
              invoiceNumber={item.invoiceNumber}
            />
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function ReturnedItemsPanel({ report }: { report: ReturnedItemsDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No returned items"
        message="No returned items were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Returned Items"
      description="Returned line items with transaction and return dates."
      badge="Returns"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={item.itemId}
          title={item.itemName}
          subtitle={`#${formatInvoiceNumber(item.invoiceNumber)} / Txn ${formatDateTime(item.transactionDate)} / Return ${formatDateTime(item.returnDate)}`}
          value={formatCurrency(item.returnAmount)}
          meta={<ReportField label="Quantity" value={item.quantity} />}
        />
      ))}
    </ReportSectionCard>
  );
}

export function ReturnedInvoiceRecordsPanel({ report }: { report: ReturnedInvoiceRecordsDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No returned records"
        message="No returned invoice records were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Returned Invoice Records"
      description="Refund records with source invoice context."
      badge="Records"
    >
      {report.items.map((item) => (
        <ReportListCard
          key={item.invoiceId}
          title={`#${formatInvoiceNumber(item.invoiceNumber)}`}
          subtitle={`${formatDateTime(item.transactionDate)} / ${item.terminalName} / ${item.cashierName}`}
          badges={
            <Badge variant="outline" className="rounded-full uppercase">
              {item.recordType.replace("_", " ")}
            </Badge>
          }
          value={formatCurrency(item.returnedAmount)}
          meta={<ReportField label="Original Amount" value={formatCurrency(item.totalAmount)} />}
        />
      ))}
    </ReportSectionCard>
  );
}
