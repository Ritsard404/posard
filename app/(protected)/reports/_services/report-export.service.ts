import "server-only";

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
  ReturnedInvoiceRecordsDto,
  ReturnedItemsDto,
  SalesBookDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "@/app/(protected)/report/_services/_dto/report.dto";
import type { ReportsRouteSlug } from "../_components/reports-config";
import {
  formatReportExportDate,
  formatReportExportDateTime,
} from "@/lib/report-date-format";
import { buildSpreadsheetXml } from "@/lib/export/spreadsheet-xml";

type ExportableReportData =
  | AuditTrailDto
  | DebtCollectionsDto
  | DebtOutstandingDto
  | DailyTransactionsDto
  | DiscountReportDto
  | InventoryValueReportDto
  | InvoiceDocumentsDto
  | NonSalesIncomeReportDto
  | ProductProfitReportDto
  | ProductVelocityReportDto
  | RefundInvoicesDto
  | RevenueGoalReportDto
  | ReturnedInvoiceRecordsDto
  | ReturnedItemsDto
  | SalesBookDto
  | TransactionHistoryDto
  | TransactionListDto
  | VoidedListDto
  | XReadingDto
  | ZReadingDto;

function formatDate(value: Date) {
  return formatReportExportDate(value);
}

function formatDateTime(value: Date) {
  return formatReportExportDateTime(value);
}

function stringifyCell(value: unknown): string {
  if (value instanceof Date) return formatDateTime(value);
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function createCsv(headers: string[], rows: string[][]) {
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")),
  ].join("\n");
}

function buildWorkbook(headers: string[], rows: string[][]) {
  return buildSpreadsheetXml({
    sheets: [
      {
        name: "Report",
        rows: [headers, ...rows],
      },
    ],
  });
}

function mapRows(slug: ReportsRouteSlug, data: ExportableReportData) {
  switch (slug) {
    case "sales": {
      const report = data as TransactionHistoryDto;
      return {
        headers: [
          "Transaction No.",
          "Date",
          "Cashier",
          "Terminal",
          "Customer",
          "Payment Methods",
          "Gross Amount",
          "Discount",
          "Returned Amount",
          "Net Amount",
          "Status",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          formatDateTime(item.createdAt),
          item.cashierName,
          item.terminalName,
          item.customerName,
          item.paymentMethods.map((method) => `${method.name} (${method.amount})`).join("; "),
          stringifyCell(item.totalAmount),
          stringifyCell(item.discountAmount),
          stringifyCell(item.returnedAmount),
          stringifyCell(item.totalAmount - item.discountAmount - item.returnedAmount),
          item.status,
        ]),
      };
    }
    case "daily-transactions": {
      const report = data as DailyTransactionsDto;
      return {
        headers: [
          "Business Date",
          "Terminal",
          "Invoice Count",
          "Gross Sales",
          "Discounts",
          "Returns",
          "Voids",
          "Net Sales",
          "Cash Sales",
          "Reference Payments",
        ],
        rows: report.items.map((item) => [
          formatDate(item.businessDate),
          item.terminalName,
          stringifyCell(item.invoiceCount),
          stringifyCell(item.grossSales),
          stringifyCell(item.totalDiscounts),
          stringifyCell(item.totalReturns),
          stringifyCell(item.totalVoids),
          stringifyCell(item.netSales),
          stringifyCell(item.cashSales),
          stringifyCell(item.ePaymentSales),
        ]),
      };
    }
    case "debt-outstanding": {
      const report = data as DebtOutstandingDto;
      return {
        headers: [
          "Invoice No.",
          "Customer",
          "Terminal",
          "Status",
          "Original Amount",
          "Paid Amount",
          "Remaining Amount",
          "Due Date",
          "Created At",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          item.customerName,
          item.terminalName,
          item.status,
          stringifyCell(item.originalAmount),
          stringifyCell(item.paidAmount),
          stringifyCell(item.remainingAmount),
          formatDateTime(item.dueDate),
          formatDateTime(item.createdAt),
        ]),
      };
    }
    case "debt-collections": {
      const report = data as DebtCollectionsDto;
      return {
        headers: [
          "Invoice No.",
          "Customer",
          "Terminal",
          "Received By",
          "Method",
          "Reference No.",
          "Amount",
          "Remaining Amount",
          "Collected At",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          item.customerName,
          item.terminalName,
          item.receivedByName,
          item.method,
          item.referenceNo ?? "",
          stringifyCell(item.amount),
          stringifyCell(item.remainingAmount),
          formatDateTime(item.createdAt),
        ]),
      };
    }
    case "transaction-list":
    case "discounts":
    case "senior-discounts":
    case "dswd-discounts": {
      const report = data as TransactionListDto | DiscountReportDto;
      return {
        headers: [
          "Invoice No.",
          "Date",
          "Source",
          "Status",
          "Terminal",
          "Cashier",
          "Customer",
          "Discount Type",
          "Gross Sales",
          "Returns",
          "Discount",
          "Net Sales",
          "VAT",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          formatDateTime(item.entryDate),
          item.source,
          item.status,
          item.terminalName,
          item.cashierName,
          item.customerName,
          item.discountType ?? "",
          stringifyCell(item.grossSales),
          stringifyCell(item.returns),
          stringifyCell(item.lessDiscount),
          stringifyCell(item.netOfSales),
          stringifyCell(item.vat),
        ]),
      };
    }
    case "sales-book": {
      const report = data as SalesBookDto;
      return {
        headers: [
          "Business Date",
          "Terminal",
          "Invoice Count",
          "Gross Sales",
          "Discounts",
          "Returns",
          "Voids",
          "Net Sales",
          "Vatable Sales",
          "VAT Amount",
        ],
        rows: report.items.map((item) => [
          formatDate(item.businessDate),
          item.terminalName,
          stringifyCell(item.invoiceCount),
          stringifyCell(item.grossSales),
          stringifyCell(item.totalDiscounts),
          stringifyCell(item.totalReturns),
          stringifyCell(item.totalVoids),
          stringifyCell(item.netSales),
          stringifyCell(item.vatableSales),
          stringifyCell(item.vatAmount),
        ]),
      };
    }
    case "product-profit": {
      const report = data as ProductProfitReportDto;
      return {
        headers: [
          "Product",
          "Category",
          "Sold Quantity",
          "Revenue",
          "COGS",
          "Gross Profit",
          "Gross Margin %",
          "Markup %",
        ],
        rows: report.items.map((item) => [
          item.name,
          item.categoryName ?? "",
          stringifyCell(item.soldQuantity),
          stringifyCell(item.revenue),
          stringifyCell(item.costOfGoods),
          stringifyCell(item.grossProfit),
          stringifyCell(item.grossMarginPercent),
          item.markupPercent === null ? "" : stringifyCell(item.markupPercent),
        ]),
      };
    }
    case "movement-velocity": {
      const report = data as ProductVelocityReportDto;
      return {
        headers: [
          "Product",
          "Category",
          "On Hand",
          "Reorder Point",
          "Sold Quantity",
          "Revenue",
          "Average Daily Sales",
          "Days Since Last Sale",
          "Projected Stockout Days",
          "Velocity",
          "Risk",
        ],
        rows: report.items.map((item) => [
          item.name,
          item.categoryName ?? "",
          stringifyCell(item.quantityOnHand),
          stringifyCell(item.reorderPoint),
          stringifyCell(item.soldQuantity),
          stringifyCell(item.revenue),
          stringifyCell(item.averageDailySales),
          stringifyCell(item.daysSinceLastSale),
          stringifyCell(item.projectedStockoutDays),
          item.velocity,
          item.riskLevel,
        ]),
      };
    }
    case "inventory-value": {
      const report = data as InventoryValueReportDto;
      return {
        headers: [
          "Product",
          "Category",
          "Supplier",
          "Shelf",
          "Batch",
          "Expiry",
          "Expiry Bucket",
          "Quantity",
          "Unit Cost",
          "Unit Price",
          "Cost Value",
          "Retail Value",
          "Potential Profit",
        ],
        rows: report.items.map((item) => [
          item.productName,
          item.categoryName ?? "",
          item.supplierName ?? "",
          item.shelfLocation ?? "",
          item.batchNumber ?? "",
          item.expiryDate ? formatDate(item.expiryDate) : "",
          item.expiryBucket,
          stringifyCell(item.quantityOnHand),
          stringifyCell(item.unitCost),
          stringifyCell(item.unitPrice),
          stringifyCell(item.costValue),
          stringifyCell(item.retailValue),
          stringifyCell(item.potentialProfit),
        ]),
      };
    }
    case "revenue-goal": {
      const report = data as RevenueGoalReportDto;
      return {
        headers: ["Metric", "Value"],
        rows: [
          ["Month", formatDate(report.month)],
          ["Target", stringifyCell(report.targetAmount)],
          ["Actual Sales", stringifyCell(report.actualSales)],
          ["Variance", stringifyCell(report.varianceAmount)],
          ["Progress %", stringifyCell(report.progressPercent)],
          ["Daily Run-rate", stringifyCell(report.dailyRunRate)],
          ["Required Daily Run-rate", stringifyCell(report.requiredDailyRunRate)],
          ["Projected Month-end Sales", stringifyCell(report.projectedMonthEndSales)],
          ["Days Elapsed", stringifyCell(report.daysElapsed)],
          ["Days Remaining", stringifyCell(report.daysRemaining)],
          ["Notes", report.notes ?? ""],
        ],
      };
    }
    case "non-sales-income": {
      const report = data as NonSalesIncomeReportDto;
      return {
        headers: [
          "Reference",
          "Date",
          "Source",
          "Amount",
          "External Reference",
          "Terminal",
          "Created By",
          "Notes",
        ],
        rows: report.items.map((item) => [
          item.referenceNumber,
          formatDate(item.incomeDate),
          item.source,
          stringifyCell(item.amount),
          item.externalReference ?? "",
          item.terminalName,
          item.createdByName,
          item.notes ?? "",
        ]),
      };
    }
    case "x-reading": {
      const report = data as XReadingDto;
      return {
        headers: ["Metric", "Value"],
        rows: [
          ["Terminal", report.terminalName],
          ["Cashier", report.cashierName],
          ["Opening Fund", stringifyCell(report.openingFund)],
          ["Cash Sales", stringifyCell(report.cashSales)],
          ["Expected Cash", stringifyCell(report.expectedCash)],
          ["Actual Cash", stringifyCell(report.actualCash)],
          ["Short / Over", stringifyCell(report.shortOver)],
          ["Void Count", stringifyCell(report.voidCount)],
          ["Void Amount", stringifyCell(report.voidAmount)],
        ],
      };
    }
    case "z-reading": {
      const report = data as ZReadingDto;
      return {
        headers: ["Metric", "Value"],
        rows: [
          ["Terminal", report.terminalName],
          ["Gross Sales", stringifyCell(report.grossSales)],
          ["Net Sales", stringifyCell(report.netSales)],
          ["Cash Sales", stringifyCell(report.cashSales)],
          ["Reference Payments", stringifyCell(report.ePaymentSales)],
          ["Vatable Sales", stringifyCell(report.vatableSales)],
          ["VAT Amount", stringifyCell(report.vatAmount)],
          ["Returns", stringifyCell(report.totalReturns)],
          ["Voids", stringifyCell(report.totalVoids)],
        ],
      };
    }
    case "audit-trail": {
      const report = data as AuditTrailDto;
      return {
        headers: ["When", "Action", "Actor", "Role", "Terminal", "Amount", "Details"],
        rows: report.items.map((item) => [
          formatDateTime(item.occurredAt),
          item.action,
          item.actorName,
          item.actorRole,
          item.terminalName ?? "",
          stringifyCell(item.amount),
          item.changes ?? "",
        ]),
      };
    }
    case "voided": {
      const report = data as VoidedListDto;
      return {
        headers: [
          "Invoice No.",
          "Transaction Date",
          "Voided Date",
          "Cashier",
          "Cancelled By",
          "Terminal",
          "Gross Sales",
          "Discount",
          "Amount Due",
          "VAT",
          "Reason",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          formatDateTime(item.transactionDate),
          formatDateTime(item.voidedDate),
          item.cashierName,
          item.cancelledBy ?? "",
          item.terminalName,
          stringifyCell(item.grossSales),
          stringifyCell(item.discountAmount),
          stringifyCell(item.amountDue),
          stringifyCell(item.vat),
          item.reason ?? "",
        ]),
      };
    }
    case "refunds": {
      const report = data as RefundInvoicesDto;
      return {
        headers: [
          "Invoice No.",
          "Transaction Date",
          "Refund Date",
          "Cashier",
          "Manager",
          "Terminal",
          "Customer",
          "Total Amount",
          "Returned Amount",
          "Item Count",
          "Type",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          formatDateTime(item.transactionDate),
          formatDateTime(item.refundDate),
          item.cashierName,
          item.managerName ?? "",
          item.terminalName,
          item.customerName,
          stringifyCell(item.totalAmount),
          stringifyCell(item.returnedAmount),
          stringifyCell(item.itemCount),
          item.isFullRefund ? "Full Return" : "Partial Return",
        ]),
      };
    }
    case "returned-items": {
      const report = data as ReturnedItemsDto;
      return {
        headers: [
          "Invoice No.",
          "Item",
          "Barcode",
          "Quantity",
          "Price",
          "Return Amount",
          "Transaction Date",
          "Return Date",
          "Terminal",
          "Cashier",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          item.itemName,
          item.barcode ?? "",
          stringifyCell(item.quantity),
          stringifyCell(item.price),
          stringifyCell(item.returnAmount),
          formatDateTime(item.transactionDate),
          formatDateTime(item.returnDate),
          item.terminalName,
          item.cashierName,
        ]),
      };
    }
    case "returned-records": {
      const report = data as ReturnedInvoiceRecordsDto;
      return {
        headers: [
          "Invoice No.",
          "Transaction Date",
          "Record Date",
          "Terminal",
          "Cashier",
          "Customer",
          "Returned Amount",
          "Type",
          "Reason",
        ],
        rows: report.items.map((item) => [
          String(item.invoiceNumber),
          formatDateTime(item.transactionDate),
          formatDateTime(item.recordDate),
          item.terminalName,
          item.cashierName,
          item.customerName,
          stringifyCell(item.returnedAmount),
          item.recordType,
          item.reason ?? "",
        ]),
      };
    }
    case "documents": {
      const report = data as InvoiceDocumentsDto;
      return {
        headers: [
          "Type",
          "Invoice No.",
          "Terminal",
          "Train Mode",
          "Reprint Count",
          "Created At",
          "Document ID",
        ],
        rows: report.items.map((item) => [
          item.type,
          item.invoiceNumber ? String(item.invoiceNumber) : "",
          item.terminalName ?? "",
          stringifyCell(item.isTrainMode),
          stringifyCell(item.reprintCount),
          formatDateTime(item.createdAt),
          item.documentId,
        ]),
      };
    }
    default:
      throw new Error("Unsupported report export.");
  }
}

export const reportExportService = {
  describe(slug: ReportsRouteSlug, data: ExportableReportData) {
    const mapped = mapRows(slug, data);
    return {
      rowCount: mapped.rows.length,
      columnCount: mapped.headers.length,
    };
  },
  buildCsv(slug: ReportsRouteSlug, data: ExportableReportData) {
    const mapped = mapRows(slug, data);
    return createCsv(mapped.headers, mapped.rows);
  },
  buildSpreadsheet(slug: ReportsRouteSlug, data: ExportableReportData) {
    const mapped = mapRows(slug, data);
    return buildWorkbook(mapped.headers, mapped.rows);
  },
};
