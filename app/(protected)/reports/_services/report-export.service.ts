import "server-only";

import * as XLSX from "xlsx";
import type {
  AuditTrailDto,
  DebtCollectionsDto,
  DebtOutstandingDto,
  DailyTransactionsDto,
  DiscountReportDto,
  RefundInvoicesDto,
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

type ExportableReportData =
  | AuditTrailDto
  | DebtCollectionsDto
  | DebtOutstandingDto
  | DailyTransactionsDto
  | DiscountReportDto
  | RefundInvoicesDto
  | ReturnedInvoiceRecordsDto
  | ReturnedItemsDto
  | SalesBookDto
  | TransactionHistoryDto
  | TransactionListDto
  | VoidedListDto
  | XReadingDto
  | ZReadingDto;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA").format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
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
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Report");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
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
    case "discounts": {
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
  }
}

export const reportExportService = {
  buildCsv(slug: ReportsRouteSlug, data: ExportableReportData) {
    const mapped = mapRows(slug, data);
    return createCsv(mapped.headers, mapped.rows);
  },
  buildXlsx(slug: ReportsRouteSlug, data: ExportableReportData) {
    const mapped = mapRows(slug, data);
    return buildWorkbook(mapped.headers, mapped.rows);
  },
};
