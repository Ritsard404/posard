import { Badge } from "@/components/ui/badge";
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
  SalesReportDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "../_services/_dto/report.dto";
import { AuditEventLog } from "./AuditEventLog";
import { InvoiceDocumentPrintButton } from "./InvoiceDocumentPrintButton";
import { ReportInvoicePrintButton } from "./ReportInvoicePrintButton";
import { ReturnInvoiceDialog } from "./ReturnInvoiceDialog";
import { formatInvoiceNumber } from "@/app/(protected)/pos/_services/print-format.service";
import {
  formatReportDate,
  formatReportDateTime,
} from "@/lib/report-date-format";
import {
  EmptyState,
  ReportField,
  ReportFieldList,
  ReportListCard,
  ReportSectionCard,
  ReportSummaryStrip,
} from "./ReportListPrimitives";

function formatDate(value: Date) {
  return formatReportDate(value);
}

function formatDateTime(value: Date) {
  return formatReportDateTime(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDocumentType(value: string) {
  if (value === "XREPORT") return "X-Report";
  if (value === "ZREPORT") return "Z-Report";

  return "Invoice";
}

function formatFulfillment(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SelectionLines({
  selections,
  note,
}: {
  selections: Array<{
    modifierGroupName: string;
    modifierGroupType: string;
    optionName: string | null;
    priceDelta: number;
    quantity: number;
    sortOrder: number;
  }>;
  note?: string | null;
}) {
  if (selections.length === 0 && !note) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      {selections.map((selection) => (
        <div key={`${selection.modifierGroupName}-${selection.optionName}-${selection.sortOrder}`}>
          - {selection.modifierGroupType === "ADDON" ? "Add-on" : selection.modifierGroupName}:{" "}
          {selection.optionName ?? "Instruction"}
          {selection.priceDelta > 0 ? ` (+${formatCurrency(selection.priceDelta)})` : ""}
          {selection.quantity > 1 ? ` x${selection.quantity}` : ""}
        </div>
      ))}
      {note ? <div>- Note: {note}</div> : null}
    </div>
  );
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
          title="Fulfillment Mix"
          description="Order count and sales by fulfillment type."
          badge="Orders"
        >
          {overview.fulfillmentBreakdown.map((item) => (
            <ReportListCard
              key={item.type}
              title={item.label}
              subtitle={`${item.count} order${item.count === 1 ? "" : "s"} / ${item.share.toFixed(0)}% share`}
              value={formatCurrency(item.sales)}
            />
          ))}
        </ReportSectionCard>

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
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ReportSectionCard
          title="Top Products"
          description="Best-selling products in the selected range."
          badge="Products"
        >
          {overview.topProducts.map((item) => (
            <ReportListCard
              key={item.id}
              title={item.name}
              subtitle={`${item.quantitySold} sold`}
              value={formatCurrency(item.revenue)}
            />
          ))}
        </ReportSectionCard>

        <ReportSectionCard
          title="Configured Items"
          description="Products sold with variants, modifiers, add-ons, or notes."
          badge="Configured"
        >
          {overview.topConfiguredProducts.length === 0 ? (
            <EmptyState title="No configured sales" message="No configured products were sold in this range." />
          ) : (
            overview.topConfiguredProducts.map((item) => (
              <ReportListCard
                key={item.id}
                title={item.name}
                subtitle={`${item.quantitySold} configured sale${item.quantitySold === 1 ? "" : "s"}`}
                value={formatCurrency(item.revenue)}
              />
            ))
          )}
        </ReportSectionCard>

        <ReportSectionCard
          title="Top Add-ons"
          description="Add-on quantity and revenue from item snapshots."
          badge="Add-ons"
        >
          {overview.topAddOns.length === 0 ? (
            <EmptyState title="No add-ons" message="No add-on selections were sold in this range." />
          ) : (
            overview.topAddOns.map((item) => (
              <ReportListCard
                key={item.id}
                title={item.name}
                subtitle={`${item.parentProductName} / Qty ${item.quantity}`}
                value={formatCurrency(item.revenue)}
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
          metrics={
            reading.isAcknowledgement
              ? [
                  { label: "VAT Status", value: "None" },
                  { label: "VAT / TIN", value: "None" },
                  { label: "Returns", value: formatCurrency(reading.totalReturns) },
                  { label: "Voids", value: formatCurrency(reading.totalVoids) },
                ]
              : [
                  { label: "Vatable Sales", value: formatCurrency(reading.vatableSales) },
                  { label: "VAT Amount", value: formatCurrency(reading.vatAmount) },
                  { label: "Returns", value: formatCurrency(reading.totalReturns) },
                  { label: "Voids", value: formatCurrency(reading.totalVoids) },
                ]
          }
        />
      </ReportSectionCard>
    </div>
  );
}

export function InvoiceDocumentsPanel({ report }: { report: InvoiceDocumentsDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No invoice documents"
        message="No archived invoice or reading documents were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Invoice Documents"
      description="Archived printable documents stored from invoices and report readings."
      badge="Documents"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 text-left font-semibold">Type</th>
              <th className="py-2 pr-3 text-left font-semibold">Invoice</th>
              <th className="py-2 pr-3 text-left font-semibold">Train Mode</th>
              <th className="py-2 pr-3 text-left font-semibold">Reprint Count</th>
              <th className="py-2 pr-3 text-left font-semibold">Created At</th>
              <th className="py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.items.map((item) => (
              <tr key={item.documentId} className="align-middle">
                <td className="py-2.5 pr-3">
                  <Badge variant="secondary" className="rounded-full">
                    {formatDocumentType(item.type)}
                  </Badge>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="font-semibold">
                    {item.invoiceNumber
                      ? `#${formatInvoiceNumber(item.invoiceNumber)}`
                      : "No linked invoice"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.terminalName ?? "Document archive"}
                  </div>
                  {item.localInvoiceNo ? (
                    <div className="text-xs font-medium text-muted-foreground">
                      Local ref: {item.localInvoiceNo}
                    </div>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">
                  <Badge variant={item.isTrainMode ? "outline" : "secondary"} className="rounded-full">
                    {item.isTrainMode ? "Train" : "Live"}
                  </Badge>
                </td>
                <td className="py-2.5 pr-3 font-semibold">
                  Reprints: {item.reprintCount}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="py-2.5 text-right">
                  <InvoiceDocumentPrintButton
                    documentId={item.documentId}
                    type={item.type}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSectionCard>
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
          subtitle={`${formatDateTime(item.createdAt)} / ${item.terminalName} / ${item.cashierName}${
            item.localInvoiceNo ? ` / Local ref ${item.localInvoiceNo}` : ""
          }`}
          badges={
            <>
              <Badge variant="secondary" className="rounded-full uppercase">{item.status}</Badge>
              <Badge variant="outline" className="rounded-full">{formatFulfillment(item.fulfillmentType)}</Badge>
              {item.containsConfiguredItems ? (
                <Badge variant="outline" className="rounded-full">Configured</Badge>
              ) : null}
              {item.returnStatus !== "NONE" ? (
                <Badge variant="destructive" className="rounded-full">
                  {item.returnStatus === "FULL" ? "Returned" : "Partially Returned"}
                </Badge>
              ) : null}
            </>
          }
          value={formatCurrency(item.totalAmount)}
          meta={
            <>
              <ReportField label="Customer" value={item.customerName || "Walk-in"} />
              {item.tableNumber ? <ReportField label="Table" value={item.tableNumber} /> : null}
              {item.deliveryReference ? <ReportField label="Delivery Ref" value={item.deliveryReference} /> : null}
              {item.deliveryAddress ? <ReportField label="Delivery Address" value={item.deliveryAddress} /> : null}
              <div className="sm:col-span-2 xl:col-span-3">
                <div className="space-y-2">
                  {item.items.map((line) => (
                    <div key={line.itemId} className="rounded-2xl bg-muted/25 px-3 py-2">
                      <div className="flex justify-between gap-3 text-sm font-medium text-foreground">
                        <span>{line.quantity} x {line.itemName}</span>
                        <span>{formatCurrency(line.subtotal)}</span>
                      </div>
                      {line.returnedQuantity > 0 ? (
                        <div className="mt-1 text-xs font-medium text-destructive">
                          Returned {line.returnedQuantity} / Available {line.returnableQuantity}
                        </div>
                      ) : null}
                      <SelectionLines selections={line.selections} note={line.specialInstructions} />
                    </div>
                  ))}
                </div>
              </div>
              {item.returns.length > 0 ? (
                <div className="sm:col-span-2 xl:col-span-3">
                  <div className="space-y-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
                    <div className="text-xs font-semibold uppercase text-destructive">Linked Returns</div>
                    {item.returns.map((invoiceReturn) => (
                      <div key={invoiceReturn.returnId} className="text-sm">
                        <div className="font-semibold">
                          R-{invoiceReturn.returnNumber} / {invoiceReturn.returnType.toLowerCase()} /{" "}
                          {formatCurrency(invoiceReturn.totalReturned)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(invoiceReturn.createdAt)} / Processed by {invoiceReturn.processedByName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          }
          actions={
            <div className="flex flex-wrap justify-end gap-2">
              {item.status !== "VOID" && item.returnStatus !== "FULL" ? (
                <ReturnInvoiceDialog invoice={item} />
              ) : null}
              <ReportInvoicePrintButton
                invoiceId={item.invoiceId}
                invoiceNumber={item.invoiceNumber}
              />
            </div>
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
          subtitle={`${formatDateTime(item.entryDate)} / ${item.terminalName} / ${item.cashierName}${
            item.localInvoiceNo ? ` / Local ref ${item.localInvoiceNo}` : ""
          }`}
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
      {(report.topAddOns.length > 0 || report.topConfiguredProducts.length > 0) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border p-3">
            <div className="mb-2 text-sm font-semibold">Top Add-ons</div>
            {report.topAddOns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No add-ons in the current page.</p>
            ) : (
              report.topAddOns.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 py-1 text-sm">
                  <span>{item.name} / {item.parentProductName}</span>
                  <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            )}
          </div>
          <div className="rounded-2xl border p-3">
            <div className="mb-2 text-sm font-semibold">Configured Products</div>
            {report.topConfiguredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No configured products in the current page.</p>
            ) : (
              report.topConfiguredProducts.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 py-1 text-sm">
                  <span>{item.name}</span>
                  <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
      {report.items.map((item) => (
        <ReportListCard
          key={`${item.invoiceId}-${item.itemId}`}
          title={item.itemName}
          subtitle={`Invoice #${formatInvoiceNumber(item.invoiceNumber)} / ${formatDate(item.invoiceDate)} / ${item.itemGroup || "Uncategorized"}`}
          badges={item.isConfigurable ? <Badge variant="outline" className="rounded-full">Configured</Badge> : null}
          value={formatCurrency(item.revenue)}
          meta={
            <>
              <ReportField label="Profit" value={formatCurrency(item.profit)} />
              <SelectionLines selections={item.selections} note={item.specialInstructions} />
            </>
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function ProductVelocityPanel({ report }: { report: ProductVelocityReportDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No inventory velocity"
        message="No tracked products were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Fast and Slow Moving Products"
      description="Velocity, last-sale recency, stockout risk, and quantity on hand."
      badge="Velocity"
    >
      <ReportSummaryStrip
        metrics={[
          { label: "Fast", value: String(report.totals.fast) },
          { label: "Steady", value: String(report.totals.steady) },
          { label: "Slow", value: String(report.totals.slow) },
          { label: "Idle", value: String(report.totals.idle) },
          { label: "High Risk", value: String(report.totals.highRisk) },
        ]}
      />
      {report.items.map((item) => (
        <ReportListCard
          key={item.productId}
          title={item.name}
          subtitle={`${item.categoryName ?? "Uncategorized"} / ${item.velocity.toUpperCase()} / ${item.riskLevel.toUpperCase()} risk`}
          value={`${item.soldQuantity.toFixed(2)} sold`}
          meta={
            <>
              <ReportField label="On hand" value={item.quantityOnHand.toFixed(2)} />
              <ReportField label="Avg/day" value={item.averageDailySales.toFixed(2)} />
              <ReportField
                label="Stockout"
                value={
                  item.projectedStockoutDays === null
                    ? "No pace"
                    : `${item.projectedStockoutDays.toFixed(1)} days`
                }
              />
              <ReportField
                label="Last sale"
                value={item.daysSinceLastSale === null ? "No sale" : `${item.daysSinceLastSale} days ago`}
              />
            </>
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function ProductProfitPanel({ report }: { report: ProductProfitReportDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No product profit"
        message="No sold products were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Profit Per Product"
      description="Sold quantity, revenue, cost of goods, gross profit, margin, and markup."
      badge="Profit"
    >
      <ReportSummaryStrip
        metrics={[
          { label: "Revenue", value: formatCurrency(report.totals.revenue) },
          { label: "COGS", value: formatCurrency(report.totals.costOfGoods) },
          { label: "Gross Profit", value: formatCurrency(report.totals.grossProfit) },
          { label: "Margin", value: `${report.totals.grossMarginPercent.toFixed(1)}%` },
        ]}
      />
      {report.items.map((item) => (
        <ReportListCard
          key={item.productId}
          title={item.name}
          subtitle={`${item.categoryName ?? "Uncategorized"} / ${item.soldQuantity.toFixed(2)} sold`}
          value={formatCurrency(item.grossProfit)}
          meta={
            <>
              <ReportField label="Revenue" value={formatCurrency(item.revenue)} />
              <ReportField label="COGS" value={formatCurrency(item.costOfGoods)} />
              <ReportField label="Margin" value={`${item.grossMarginPercent.toFixed(1)}%`} />
              <ReportField
                label="Markup"
                value={item.markupPercent === null ? "No cost" : `${item.markupPercent.toFixed(1)}%`}
              />
            </>
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function InventoryValuePanel({ report }: { report: InventoryValueReportDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No inventory value"
        message="No on-hand tracked inventory was found."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Inventory Value"
      description="On-hand stock value by category, supplier, shelf, batch, and expiry bucket."
      badge="Inventory"
    >
      <ReportSummaryStrip
        metrics={[
          { label: "Quantity", value: report.totals.quantityOnHand.toFixed(2) },
          { label: "Cost Value", value: formatCurrency(report.totals.costValue) },
          { label: "Retail Value", value: formatCurrency(report.totals.retailValue) },
          { label: "Potential Profit", value: formatCurrency(report.totals.potentialProfit) },
        ]}
      />
      {report.items.map((item, index) => (
        <ReportListCard
          key={`${item.productId}-${item.batchNumber ?? "unbatched"}-${index}`}
          title={item.productName}
          subtitle={`${item.categoryName ?? "Uncategorized"} / ${item.supplierName ?? "No supplier"} / ${item.shelfLocation ?? "No shelf"}`}
          value={formatCurrency(item.costValue)}
          badges={<Badge variant="outline" className="rounded-full">{item.expiryBucket.replace("_", " ")}</Badge>}
          meta={
            <>
              <ReportField label="Batch" value={item.batchNumber ?? "Unbatched"} />
              <ReportField label="Expiry" value={item.expiryDate ? formatDate(item.expiryDate) : "No date"} />
              <ReportField label="Quantity" value={item.quantityOnHand.toFixed(2)} />
              <ReportField label="Retail" value={formatCurrency(item.retailValue)} />
            </>
          }
        />
      ))}
    </ReportSectionCard>
  );
}

export function RevenueGoalPanel({ report }: { report: RevenueGoalReportDto }) {
  return (
    <ReportSectionCard
      title="Revenue Goal"
      description="Monthly target progress, run-rate, variance, and projected month-end sales."
      badge="Target"
    >
      <ReportSummaryStrip
        metrics={[
          { label: "Target", value: formatCurrency(report.targetAmount) },
          { label: "Actual", value: formatCurrency(report.actualSales) },
          { label: "Variance", value: formatCurrency(report.varianceAmount) },
          { label: "Progress", value: `${report.progressPercent.toFixed(1)}%` },
        ]}
      />
      <ReportListCard
        title={formatDate(report.month)}
        subtitle={`${report.daysElapsed} day${report.daysElapsed === 1 ? "" : "s"} elapsed / ${report.daysRemaining} remaining`}
        value={formatCurrency(report.projectedMonthEndSales)}
        meta={
          <>
            <ReportField label="Daily run-rate" value={formatCurrency(report.dailyRunRate)} />
            <ReportField label="Needed/day" value={formatCurrency(report.requiredDailyRunRate)} />
            <ReportField label="Notes" value={report.notes ?? "No goal notes"} />
          </>
        }
      />
    </ReportSectionCard>
  );
}

export function NonSalesIncomePanel({ report }: { report: NonSalesIncomeReportDto }) {
  if (report.items.length === 0) {
    return (
      <EmptyState
        title="No non-sales income"
        message="No non-sales income entries were found for the selected filters."
      />
    );
  }

  return (
    <ReportSectionCard
      title="Non-Sales Income"
      description="Income recorded outside invoice sales, with source, reference, terminal, and user context."
      badge="Income"
    >
      <ReportSummaryStrip
        metrics={[
          { label: "Total Income", value: formatCurrency(report.totalAmount) },
          { label: "Rows", value: String(report.pagination.totalItems) },
        ]}
      />
      {report.items.map((item) => (
        <ReportListCard
          key={item.id}
          title={item.referenceNumber}
          subtitle={`${formatDate(item.incomeDate)} / ${item.source} / ${item.terminalName}`}
          value={formatCurrency(item.amount)}
          meta={
            <>
              <ReportField label="External Ref" value={item.externalReference ?? "None"} />
              <ReportField label="Created By" value={item.createdByName} />
              <ReportField label="Notes" value={item.notes ?? "None"} />
            </>
          }
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
          meta={
            <div className="flex flex-wrap gap-4">
              <ReportField label="Discount" value={formatCurrency(item.lessDiscount)} />
              <ReportField
                label="Qualified person"
                value={item.eligibleDiscName ?? item.customerName}
              />
              <ReportField label="ID number" value={item.oscaIdNum ?? "Not recorded"} />
            </div>
          }
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
