import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AuditTrailDto,
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
import { ReportInvoicePrintButton } from "./ReportInvoicePrintButton";

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

export function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="p-6 text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function SimpleListCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function OverviewPanel({ overview }: { overview: ReportOverviewDto }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <SummaryMetric label="Net Sales" value={formatCurrency(overview.totalSales)} />
        <SummaryMetric label="Transactions" value={String(overview.totalTransactions)} />
        <SummaryMetric label="Cash Sales" value={formatCurrency(overview.totalCashSales)} />
        <SummaryMetric label="E-Payments" value={formatCurrency(overview.totalEPaymentSales)} />
        <SummaryMetric label="Returns" value={formatCurrency(overview.totalReturns)} />
        <SummaryMetric label="Voids" value={formatCurrency(overview.totalVoids)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SimpleListCard
          title="Payment Breakdown"
          description="Sales by non-cash payment method."
        >
          {overview.paymentBreakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground">No e-payment activity for this range.</div>
          ) : (
            overview.paymentBreakdown.map((payment) => (
              <div key={payment.name} className="flex items-center justify-between rounded-xl border px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">{payment.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {payment.count} transaction{payment.count === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))
          )}
        </SimpleListCard>

        <SimpleListCard
          title="Operational Flags"
          description="Live indicators tied to the selected scope."
        >
          <div className="rounded-xl border px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Active Sessions</div>
            <div className="mt-2 text-xl font-bold">{overview.activeSessionCount}</div>
          </div>
          <div className="rounded-xl border px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unread Invoices</div>
            <div className="mt-2 text-xl font-bold">{overview.unreadInvoiceCount}</div>
          </div>
          <div className="rounded-xl border px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Pending Terminal Requests</div>
            <div className="mt-2 text-xl font-bold">{overview.pendingTerminalRequests}</div>
          </div>
        </SimpleListCard>
      </div>
    </div>
  );
}

export function XReadingPanel({ reading }: { reading: XReadingDto }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryMetric label="Terminal" value={reading.terminalName} />
        <SummaryMetric label="Cashier" value={reading.cashierName} />
        <SummaryMetric label="Expected Cash" value={formatCurrency(reading.expectedCash)} />
        <SummaryMetric label="Actual Cash" value={formatCurrency(reading.actualCash)} />
      </div>
      <SimpleListCard
        title="Session Totals"
        description={`${formatDateTime(reading.range.from)} to ${formatDateTime(reading.range.to)}`}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryMetric label="Opening Fund" value={formatCurrency(reading.openingFund)} />
          <SummaryMetric label="Cash Sales" value={formatCurrency(reading.cashSales)} />
          <SummaryMetric label="Withdrawals" value={formatCurrency(reading.withdrawalAmount)} />
          <SummaryMetric label="Short / Over" value={formatCurrency(reading.shortOver)} />
        </div>
      </SimpleListCard>
    </div>
  );
}

export function ZReadingPanel({ reading }: { reading: ZReadingDto }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryMetric label="Net Sales" value={formatCurrency(reading.netSales)} />
        <SummaryMetric label="Gross Sales" value={formatCurrency(reading.grossSales)} />
        <SummaryMetric label="Cash Sales" value={formatCurrency(reading.cashSales)} />
        <SummaryMetric label="E-Payments" value={formatCurrency(reading.ePaymentSales)} />
      </div>
      <SimpleListCard
        title="Z-Reading Summary"
        description={`${reading.terminalName} / ${formatDate(reading.range.from)} to ${formatDate(reading.range.to)}`}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryMetric label="Vatable Sales" value={formatCurrency(reading.vatableSales)} />
          <SummaryMetric label="VAT Amount" value={formatCurrency(reading.vatAmount)} />
          <SummaryMetric label="Returns" value={formatCurrency(reading.totalReturns)} />
          <SummaryMetric label="Voids" value={formatCurrency(reading.totalVoids)} />
        </div>
      </SimpleListCard>
    </div>
  );
}

export function DailyTransactionsPanel({ report }: { report: DailyTransactionsDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No daily transactions found for the selected filters." />;
  }

  return (
    <SimpleListCard
      title="Daily Transactions"
      description="Daily sales rollups by date and terminal."
    >
      {report.items.map((item) => (
        <div key={`${item.businessDate.toISOString()}-${item.terminalName}`} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold">{formatDate(item.businessDate)} / {item.terminalName}</div>
              <div className="text-sm text-muted-foreground">{item.invoiceCount} invoice{item.invoiceCount === 1 ? "" : "s"}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.netSales)}</div>
              <div className="text-xs text-muted-foreground">Gross {formatCurrency(item.grossSales)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function TransactionsPanel({ history }: { history: TransactionHistoryDto }) {
  if (history.items.length === 0) {
    return <EmptyState message="No transactions found for this date range and terminal scope." />;
  }

  return (
    <SimpleListCard
      title="Transaction History"
      description={`Invoice-level activity in the selected scope. ${history.totalTransactions} matching transaction${history.totalTransactions === 1 ? "" : "s"}.`}
    >
      {history.items.map((item) => (
        <div key={item.invoiceId} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">#{item.invoiceNumber}</div>
                <Badge variant="secondary" className="rounded-full uppercase">{item.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(item.createdAt)} / {item.terminalName} / {item.cashierName}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right font-semibold">{formatCurrency(item.totalAmount)}</div>
              <ReportInvoicePrintButton invoiceId={item.invoiceId} invoiceNumber={item.invoiceNumber} />
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function TransactionListPanel({ report }: { report: TransactionListDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No transaction list entries found for the current filters." />;
  }

  return (
    <SimpleListCard
      title="Transaction List"
      description="Sales, voids, and refunds in ledger order."
    >
      {report.items.map((item, index) => (
        <div key={`${item.invoiceId}-${item.source}-${index}`} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">#{item.invoiceNumber}</div>
                <Badge variant="outline" className="rounded-full uppercase">{item.source}</Badge>
                <Badge variant="secondary" className="rounded-full uppercase">{item.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(item.entryDate)} / {item.terminalName} / {item.cashierName}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.netOfSales)}</div>
              <div className="text-xs text-muted-foreground">Gross {formatCurrency(item.grossSales)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function AuditPanel({ audit }: { audit: AuditTrailDto }) {
  if (audit.items.length === 0) {
    return <EmptyState message="No audit events found for the current filters." />;
  }

  return (
    <SimpleListCard
      title="Audit Trail"
      description={`Session events and manager approvals in time order. ${audit.pagination.totalItems} matching event${audit.pagination.totalItems === 1 ? "" : "s"}.`}
    >
      {audit.items.map((item, index) => (
        <div key={`${item.source}-${item.referenceId ?? index}-${item.occurredAt.toISOString()}`} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold">{item.action}</div>
              <div className="text-sm text-muted-foreground">{item.actorName} / {item.actorRole}</div>
              {item.terminalName ? <div className="text-xs text-muted-foreground">Terminal: {item.terminalName}</div> : null}
              {item.changes ? <div className="mt-1 text-xs text-muted-foreground">{item.changes}</div> : null}
              <div className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</div>
            </div>
            {item.amount !== null ? <div className="font-semibold">{formatCurrency(item.amount)}</div> : null}
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function SalesPanel({ report }: { report: SalesReportDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No sales items found for the selected filters." />;
  }

  return (
    <SimpleListCard
      title="Sales Lines"
      description={`Item-level sales and return impact. ${report.pagination.totalItems} matching line item${report.pagination.totalItems === 1 ? "" : "s"}.`}
    >
      {report.items.map((item) => (
        <div key={`${item.invoiceId}-${item.itemId}`} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="font-semibold">{item.itemName}</div>
              <div className="text-sm text-muted-foreground">
                Invoice #{item.invoiceNumber} / {formatDate(item.invoiceDate)} / {item.itemGroup || "Uncategorized"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.revenue)}</div>
              <div className="text-xs text-muted-foreground">Profit {formatCurrency(item.profit)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function SalesBookPanel({ report }: { report: SalesBookDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No sales book rows found for the selected filters." />;
  }

  return (
    <SimpleListCard title="Sales Book" description="Daily summarized book of sales activity.">
      {report.items.map((item) => (
        <div key={`${item.businessDate.toISOString()}-${item.terminalName}`} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold">{formatDate(item.businessDate)} / {item.terminalName}</div>
              <div className="text-sm text-muted-foreground">{item.invoiceCount} invoice{item.invoiceCount === 1 ? "" : "s"}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.netSales)}</div>
              <div className="text-xs text-muted-foreground">VAT {formatCurrency(item.vatAmount)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function VoidedListPanel({ report }: { report: VoidedListDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No voided invoices found for the selected filters." />;
  }

  return (
    <SimpleListCard title="Voided List" description="Voided and cancelled invoice records.">
      {report.items.map((item) => (
        <div key={item.invoiceId} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold">#{item.invoiceNumber}</div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(item.voidedDate)} / {item.terminalName} / {item.cashierName}
              </div>
              {item.cancelledBy ? <div className="text-xs text-muted-foreground">Cancelled by {item.cancelledBy}</div> : null}
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.amountDue)}</div>
              <div className="text-xs text-muted-foreground">Gross {formatCurrency(item.grossSales)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function DiscountReportPanel({ report }: { report: DiscountReportDto }) {
  if (report.items.length === 0) {
    return <EmptyState message={`No ${report.type} transactions found for the selected filters.`} />;
  }

  return (
    <SimpleListCard title={`${report.type} List`} description="Discount-qualified transaction list.">
      {report.items.map((item, index) => (
        <div key={`${item.invoiceId}-${index}`} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold">#{item.invoiceNumber}</div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(item.entryDate)} / {item.customerName}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.netOfSales)}</div>
              <div className="text-xs text-muted-foreground">Discount {formatCurrency(item.lessDiscount)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function RefundInvoicesPanel({ report }: { report: RefundInvoicesDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No refunded invoices found for the selected filters." />;
  }

  return (
    <SimpleListCard title="Refund Invoices" description="Fully and partially refunded invoice records.">
      {report.items.map((item) => (
        <div key={item.invoiceId} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-semibold">#{item.invoiceNumber}</div>
                <Badge variant={item.isFullRefund ? "secondary" : "outline"} className="rounded-full uppercase">
                  {item.isFullRefund ? "Full Return" : "Partial Return"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Txn {formatDateTime(item.transactionDate)} / Refund {formatDateTime(item.refundDate)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(item.returnedAmount)}</div>
                <div className="text-xs text-muted-foreground">Original {formatCurrency(item.totalAmount)}</div>
              </div>
              <ReportInvoicePrintButton invoiceId={item.invoiceId} invoiceNumber={item.invoiceNumber} />
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function ReturnedItemsPanel({ report }: { report: ReturnedItemsDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No returned items found for the selected filters." />;
  }

  return (
    <SimpleListCard title="Returned Items" description="Returned line items with transaction and return dates.">
      {report.items.map((item) => (
        <div key={item.itemId} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-semibold">{item.itemName}</div>
              <div className="text-sm text-muted-foreground">
                #{item.invoiceNumber} / Txn {formatDateTime(item.transactionDate)} / Return {formatDateTime(item.returnDate)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.returnAmount)}</div>
              <div className="text-xs text-muted-foreground">Qty {item.quantity}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}

export function ReturnedInvoiceRecordsPanel({ report }: { report: ReturnedInvoiceRecordsDto }) {
  if (report.items.length === 0) {
    return <EmptyState message="No returned invoice records found for the selected filters." />;
  }

  return (
    <SimpleListCard title="Returned Invoice Records" description="Refund records with source invoice context.">
      {report.items.map((item) => (
        <div key={item.invoiceId} className="rounded-2xl border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-semibold">#{item.invoiceNumber}</div>
                <Badge variant="outline" className="rounded-full uppercase">{item.recordType.replace("_", " ")}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(item.transactionDate)} / {item.terminalName} / {item.cashierName}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatCurrency(item.returnedAmount)}</div>
              <div className="text-xs text-muted-foreground">Original {formatCurrency(item.totalAmount)}</div>
            </div>
          </div>
        </div>
      ))}
    </SimpleListCard>
  );
}
