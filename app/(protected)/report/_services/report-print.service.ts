import "server-only";

import type {
  AuditTrailDto,
  DailyTransactionsDto,
  DiscountReportDto,
  RefundInvoicesDto,
  ReportOverviewDto,
  ReportPaymentBreakdownDto,
  ReportPrintPayloadDto,
  ReportPrintableView,
  ReportTerminalOptionDto,
  ReturnedInvoiceRecordsDto,
  ReturnedItemsDto,
  SalesReportDto,
  SalesBookDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "./_dto/report.dto";

const LINE_WIDTH = 42;

type ReportDetailDto =
  | AuditTrailDto
  | DailyTransactionsDto
  | DiscountReportDto
  | RefundInvoicesDto
  | ReturnedInvoiceRecordsDto
  | ReturnedItemsDto
  | SalesReportDto
  | SalesBookDto
  | TransactionHistoryDto
  | TransactionListDto
  | VoidedListDto
  | XReadingDto
  | ZReadingDto;

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

function divider(char = "-") {
  return char.repeat(LINE_WIDTH);
}

function center(text: string) {
  const clean = text.trim();

  if (clean.length >= LINE_WIDTH) {
    return clean;
  }

  const leftPadding = Math.floor((LINE_WIDTH - clean.length) / 2);
  return `${" ".repeat(leftPadding)}${clean}`;
}

function labelValue(label: string, value: string) {
  const trimmedLabel = label.trim();
  const trimmedValue = value.trim();
  const available = LINE_WIDTH - trimmedLabel.length - trimmedValue.length - 1;

  if (available < 1) {
    return `${trimmedLabel}\n${trimmedValue}`;
  }

  return `${trimmedLabel}${" ".repeat(available)} ${trimmedValue}`;
}

function formatPaymentLines(items: ReportPaymentBreakdownDto[]) {
  if (items.length === 0) {
    return ["No e-payment activity"];
  }

  return items.flatMap((item) => [
    labelValue(item.name, formatCurrency(item.amount)),
    `${item.count} transaction${item.count === 1 ? "" : "s"}`,
  ]);
}

function getTerminalName(terminal: ReportTerminalOptionDto | null) {
  return terminal?.name ?? "All terminals";
}

function getPrinterAvailability(terminal: ReportTerminalOptionDto | null) {
  const printerName = terminal?.printerName?.trim() || null;

  if (!terminal) {
    return {
      printerAvailable: false,
      printerName: null,
      message:
        "No terminal printer is selected. Showing printable preview instead.",
    };
  }

  if (!printerName) {
    return {
      printerAvailable: false,
      printerName: null,
      message: "No paired printer found. Showing printable preview instead.",
    };
  }

  return {
    printerAvailable: true,
    printerName,
    message: `Printer found (${printerName}). Choose how you want to continue.`,
  };
}

function buildHeader(input: {
  title: string;
  terminalName: string;
  generatedAtLabel: string;
  printerName: string | null;
}) {
  return [
    center("POSARD REPORT"),
    center(input.title.toUpperCase()),
    divider("="),
    labelValue("Generated", input.generatedAtLabel),
    labelValue("Terminal", input.terminalName),
    labelValue("Printer", input.printerName ?? "Preview only"),
    divider(),
  ];
}

function buildOverviewLines(overview: ReportOverviewDto) {
  return [
    labelValue("Range", `${formatDate(overview.range.from)} - ${formatDate(overview.range.to)}`),
    divider(),
    labelValue("Net Sales", formatCurrency(overview.totalSales)),
    labelValue("Transactions", String(overview.totalTransactions)),
    labelValue("Cash Sales", formatCurrency(overview.totalCashSales)),
    labelValue("E-Payments", formatCurrency(overview.totalEPaymentSales)),
    labelValue("Returns", formatCurrency(overview.totalReturns)),
    labelValue("Voids", formatCurrency(overview.totalVoids)),
    labelValue("Discounts", formatCurrency(overview.totalDiscounts)),
    divider(),
    "PAYMENT BREAKDOWN",
    ...formatPaymentLines(overview.paymentBreakdown),
    divider(),
    labelValue("Active Sessions", String(overview.activeSessionCount)),
    labelValue("Unread Invoices", String(overview.unreadInvoiceCount)),
    labelValue("Pending Requests", String(overview.pendingTerminalRequests)),
  ];
}

function buildXReadingLines(reading: XReadingDto) {
  return [
    labelValue("Range", `${formatDateTime(reading.range.from)} - ${formatDateTime(reading.range.to)}`),
    labelValue("Cashier", reading.cashierName),
    divider(),
    labelValue("Invoice Count", String(reading.invoiceCount)),
    labelValue("Opening Fund", formatCurrency(reading.openingFund)),
    labelValue("Cash Sales", formatCurrency(reading.cashSales)),
    labelValue("Withdrawals", formatCurrency(reading.withdrawalAmount)),
    labelValue("Refunds", formatCurrency(reading.refundAmount)),
    labelValue("Refund Count", String(reading.refundCount)),
    labelValue("Voids", formatCurrency(reading.voidAmount)),
    labelValue("Void Count", String(reading.voidCount)),
    labelValue("Expected Cash", formatCurrency(reading.expectedCash)),
    labelValue("Actual Cash", formatCurrency(reading.actualCash)),
    labelValue("Short / Over", formatCurrency(reading.shortOver)),
    labelValue("Payments", formatCurrency(reading.paymentsReceived)),
    divider(),
    "OTHER PAYMENTS",
    ...formatPaymentLines(reading.otherPayments),
  ];
}

function buildZReadingLines(reading: ZReadingDto) {
  return [
    labelValue("Range", `${formatDate(reading.range.from)} - ${formatDate(reading.range.to)}`),
    divider(),
    labelValue("Invoice Count", String(reading.invoiceCount)),
    labelValue("Gross Sales", formatCurrency(reading.grossSales)),
    labelValue("Net Sales", formatCurrency(reading.netSales)),
    labelValue("Cash Sales", formatCurrency(reading.cashSales)),
    labelValue("E-Payments", formatCurrency(reading.ePaymentSales)),
    labelValue("Returns", formatCurrency(reading.totalReturns)),
    labelValue("Voids", formatCurrency(reading.totalVoids)),
    labelValue("Discounts", formatCurrency(reading.totalDiscounts)),
    divider(),
    labelValue("VATable Sales", formatCurrency(reading.vatableSales)),
    labelValue("VAT Amount", formatCurrency(reading.vatAmount)),
    labelValue("VAT Exempt", formatCurrency(reading.vatExemptSales)),
    labelValue("VAT Zero", formatCurrency(reading.vatZeroSales)),
    divider(),
    labelValue("Opening Fund", formatCurrency(reading.openingFund)),
    labelValue("Drawer Cash", formatCurrency(reading.drawerCash)),
    labelValue("Withdrawals", formatCurrency(reading.withdrawalAmount)),
    labelValue("Short / Over", formatCurrency(reading.shortOver)),
    labelValue("Accum Sales", formatCurrency(reading.presentAccumulatedSales)),
    divider(),
    "PAYMENT BREAKDOWN",
    ...formatPaymentLines(reading.paymentBreakdown),
  ];
}

function buildTransactionLines(history: TransactionHistoryDto) {
  return [
    labelValue("Range", `${formatDate(history.range.from)} - ${formatDate(history.range.to)}`),
    labelValue("Transactions", String(history.totalTransactions)),
    labelValue("Gross Sales", formatCurrency(history.grossSales)),
    labelValue("Discounts", formatCurrency(history.totalDiscounts)),
    labelValue("Returns", formatCurrency(history.totalReturns)),
    labelValue("Net Sales", formatCurrency(history.totalNetSales)),
    divider(),
    "TRANSACTION LINES",
    ...history.items.flatMap((item) => [
      `#${String(item.invoiceNumber).padStart(12, "0")}`,
      labelValue("When", formatDateTime(item.createdAt)),
      labelValue("Terminal", item.terminalName),
      labelValue("Cashier", item.cashierName),
      labelValue("Status", item.status),
      labelValue("Total", formatCurrency(item.totalAmount)),
      divider(),
    ]),
  ];
}

function buildDailyTransactionLines(report: DailyTransactionsDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "DAILY TRANSACTIONS",
    ...report.items.flatMap((item) => [
      `${formatDate(item.businessDate)} / ${item.terminalName}`,
      labelValue("Invoices", String(item.invoiceCount)),
      labelValue("Net Sales", formatCurrency(item.netSales)),
      labelValue("Gross Sales", formatCurrency(item.grossSales)),
      divider(),
    ]),
  ];
}

function buildTransactionLedgerLines(report: TransactionListDto | DiscountReportDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "TRANSACTION LEDGER",
    ...report.items.flatMap((item) => [
      `#${String(item.invoiceNumber).padStart(12, "0")} ${item.source}`,
      labelValue("Date", formatDateTime(item.entryDate)),
      labelValue("Net Sales", formatCurrency(item.netOfSales)),
      labelValue("Returns", formatCurrency(item.returns)),
      divider(),
    ]),
  ];
}

function buildVoidedLines(report: VoidedListDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "VOIDED LIST",
    ...report.items.flatMap((item) => [
      `#${String(item.invoiceNumber).padStart(12, "0")}`,
      labelValue("Voided", formatDateTime(item.voidedDate)),
      labelValue("Amount Due", formatCurrency(item.amountDue)),
      labelValue("Reason", item.reason ?? "N/A"),
      divider(),
    ]),
  ];
}

function buildAuditLines(audit: AuditTrailDto) {
  return [
    labelValue("Range", `${formatDate(audit.range.from)} - ${formatDate(audit.range.to)}`),
    labelValue("Events", String(audit.pagination.totalItems)),
    divider(),
    "AUDIT EVENTS",
    ...audit.items.flatMap((item) => [
      item.action,
      labelValue("When", formatDateTime(item.occurredAt)),
      labelValue("Actor", `${item.actorName} (${item.actorRole})`),
      labelValue("Terminal", item.terminalName ?? "N/A"),
      ...(item.amount !== null
        ? [labelValue("Amount", formatCurrency(item.amount))]
        : []),
      ...(item.referenceId ? [labelValue("Ref", item.referenceId)] : []),
      ...(item.changes ? [item.changes] : []),
      divider(),
    ]),
  ];
}

function buildSalesLines(report: SalesReportDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Lines", String(report.pagination.totalItems)),
    divider(),
    labelValue("Revenue", formatCurrency(report.totals.totalRevenue)),
    labelValue("Profit", formatCurrency(report.totals.totalProfit)),
    labelValue("Total Cost", formatCurrency(report.totals.overallTotalCost)),
    divider(),
    "SALES LINES",
    ...report.items.flatMap((item) => [
      item.itemName,
      labelValue("Invoice", String(item.invoiceNumber)),
      labelValue("Qty", String(item.quantity)),
      labelValue("Revenue", formatCurrency(item.revenue)),
      labelValue("Profit", formatCurrency(item.profit)),
      labelValue("Group", item.itemGroup || "Uncategorized"),
      divider(),
    ]),
  ];
}

function buildSalesBookLines(report: SalesBookDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "SALES BOOK",
    ...report.items.flatMap((item) => [
      `${formatDate(item.businessDate)} / ${item.terminalName}`,
      labelValue("Net Sales", formatCurrency(item.netSales)),
      labelValue("VAT", formatCurrency(item.vatAmount)),
      divider(),
    ]),
  ];
}

function buildRefundInvoiceLines(report: RefundInvoicesDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "REFUND INVOICES",
    ...report.items.flatMap((item) => [
      `#${String(item.invoiceNumber).padStart(12, "0")}`,
      labelValue("Refund Date", formatDateTime(item.refundDate)),
      labelValue("Returned", formatCurrency(item.returnedAmount)),
      divider(),
    ]),
  ];
}

function buildReturnedItemLines(report: ReturnedItemsDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "RETURNED ITEMS",
    ...report.items.flatMap((item) => [
      item.itemName,
      labelValue("Invoice", String(item.invoiceNumber)),
      labelValue("Returned", formatCurrency(item.returnAmount)),
      divider(),
    ]),
  ];
}

function buildReturnedRecordLines(report: ReturnedInvoiceRecordsDto) {
  return [
    labelValue("Range", `${formatDate(report.range.from)} - ${formatDate(report.range.to)}`),
    labelValue("Rows", String(report.pagination.totalItems)),
    divider(),
    "RETURNED RECORDS",
    ...report.items.flatMap((item) => [
      `#${String(item.invoiceNumber).padStart(12, "0")}`,
      labelValue("Type", item.recordType.replace("_", " ")),
      labelValue("Returned", formatCurrency(item.returnedAmount)),
      divider(),
    ]),
  ];
}

function buildBody(view: ReportPrintableView, overview: ReportOverviewDto | null, detail: ReportDetailDto | null) {
  switch (view) {
    case "overview":
      return overview ? buildOverviewLines(overview) : null;
    case "x-reading":
      return detail ? buildXReadingLines(detail as XReadingDto) : null;
    case "z-reading":
      return detail ? buildZReadingLines(detail as ZReadingDto) : null;
    case "daily-transactions":
      return detail ? buildDailyTransactionLines(detail as DailyTransactionsDto) : null;
    case "transaction-list":
      return detail ? buildTransactionLedgerLines(detail as TransactionListDto) : null;
    case "transactions":
      return detail ? buildTransactionLines(detail as TransactionHistoryDto) : null;
    case "voided-list":
      return detail ? buildVoidedLines(detail as VoidedListDto) : null;
    case "pwd-list":
    case "senior-list":
      return detail ? buildTransactionLedgerLines(detail as DiscountReportDto) : null;
    case "audit":
      return detail ? buildAuditLines(detail as AuditTrailDto) : null;
    case "sales":
      return detail ? buildSalesLines(detail as SalesReportDto) : null;
    case "sales-book":
      return detail ? buildSalesBookLines(detail as SalesBookDto) : null;
    case "refund-invoices":
      return detail ? buildRefundInvoiceLines(detail as RefundInvoicesDto) : null;
    case "returned-items":
      return detail ? buildReturnedItemLines(detail as ReturnedItemsDto) : null;
    case "returned-records":
      return detail ? buildReturnedRecordLines(detail as ReturnedInvoiceRecordsDto) : null;
    default:
      return null;
  }
}

function getTitle(view: ReportPrintableView) {
  switch (view) {
    case "overview":
      return "Overview";
    case "x-reading":
      return "X-Reading";
    case "z-reading":
      return "Z-Reading";
    case "daily-transactions":
      return "Daily Transactions";
    case "transaction-list":
      return "Transaction List";
    case "transactions":
      return "Transaction History";
    case "voided-list":
      return "Voided List";
    case "pwd-list":
      return "PWD List";
    case "senior-list":
      return "Senior List";
    case "audit":
      return "Audit Trail";
    case "sales":
      return "Sales Report";
    case "sales-book":
      return "Sales Book";
    case "refund-invoices":
      return "Refund Invoices";
    case "returned-items":
      return "Returned Items";
    case "returned-records":
      return "Returned Records";
  }
}

export const reportPrintService = {
  buildPayload(input: {
    view: ReportPrintableView;
    overview: ReportOverviewDto | null;
    detail: ReportDetailDto | null;
    selectedTerminal: ReportTerminalOptionDto | null;
  }): ReportPrintPayloadDto | null {
    const body = buildBody(input.view, input.overview, input.detail);

    if (!body) {
      return null;
    }

    const { printerAvailable, printerName, message } = getPrinterAvailability(
      input.selectedTerminal,
    );
    const terminalName = getTerminalName(input.selectedTerminal);
    const generatedAtLabel = formatDateTime(new Date());
    const title = getTitle(input.view);
    const previewContent = [
      ...buildHeader({
        title,
        terminalName,
        generatedAtLabel,
        printerName,
      }),
      ...body,
      divider("="),
      center("END OF REPORT"),
    ].join("\n");

    return {
      title,
      view: input.view,
      printerAvailable,
      printerName,
      terminalName,
      generatedAtLabel,
      message,
      previewContent,
    };
  },
};
