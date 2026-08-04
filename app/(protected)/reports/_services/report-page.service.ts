import "server-only";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { reportAccessService } from "@/app/(protected)/report/_services/report-access.service";
import { reportPrintService } from "@/app/(protected)/report/_services/report-print.service";
import { reportService } from "@/app/(protected)/report/_services/report.service";
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
import {
  getReportRouteDefinition,
  REPORT_ROUTE_DEFINITIONS,
  type ReportPeriod,
  type ReportPreset,
} from "../_components/reports-config";
import type { ReportSortOrder } from "@/app/(protected)/report/_components/report-workspace-config";
import {
  formatReportDate,
  formatReportDateInput,
} from "@/lib/report-date-format";
import { parseCustomReportDateRange } from "@/lib/report-date-range";

export { parseCustomReportDateRange } from "@/lib/report-date-range";

type SearchParams = Record<string, string | string[] | undefined>;
export type LoadedReportData =
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

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getDocumentTypeParam(value: string | undefined): "INVOICE" | "XREPORT" | "ZREPORT" | "all" {
  return value === "INVOICE" || value === "XREPORT" || value === "ZREPORT"
    ? value
    : "all";
}

function getTrainModeParam(value: string | undefined): "all" | "training" | "live" {
  return value === "training" || value === "live" ? value : "all";
}

function normalizeStartOfDay(value: Date) {
  return reportService.normalizeStartOfDay(value);
}

function normalizeEndOfDay(value: Date) {
  return reportService.normalizeEndOfDay(value);
}

async function getEarliestAvailableDate(companyId: string, terminalId?: string) {
  const invoiceWhere = {
    posTerminal: {
      companyId,
      ...(terminalId ? { id: terminalId } : {}),
    },
  } satisfies Prisma.InvoiceWhereInput;

  const timestampWhere = {
    posTerminal: {
      companyId,
      ...(terminalId ? { id: terminalId } : {}),
    },
  } satisfies Prisma.TimestampWhereInput;

  const auditWhere = {
    companyId,
    ...(terminalId ? { posTerminalId: terminalId } : {}),
  } satisfies Prisma.AuditLogWhereInput;

  const [invoice, timestamp, auditLog] = await Promise.all([
    prisma.invoice.findFirst({
      where: invoiceWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timestamp.findFirst({
      where: timestampWhere,
      select: { timestampIn: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findFirst({
      where: auditWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const dates = [
    invoice?.createdAt,
    timestamp?.timestampIn ?? timestamp?.createdAt,
    auditLog?.createdAt,
  ].filter((value): value is Date => value instanceof Date);

  if (dates.length === 0) {
    return normalizeStartOfDay(new Date());
  }

  return normalizeStartOfDay(
    new Date(Math.min(...dates.map((value) => value.getTime()))),
  );
}

async function resolveDateRange(input: {
  preset?: string | null;
  period?: string | null;
  from?: string | null;
  to?: string | null;
  companyId: string;
  terminalId?: string;
  forceAllHistory?: boolean;
}) {
  const today = new Date();
  const parsedPreset = input.preset as ReportPreset | null;
  const parsedPeriod =
    input.period === "weekly" ||
    input.period === "monthly" ||
    input.period === "annual" ||
    input.period === "daily"
      ? input.period
      : null;
  const defaultPeriod: ReportPeriod =
    parsedPeriod ??
    (parsedPreset === "7d"
      ? "weekly"
      : parsedPreset === "30d" ||
          parsedPreset === "thisMonth" ||
          parsedPreset === "lastMonth"
        ? "monthly"
        : parsedPreset === "thisYear" ||
            parsedPreset === "lastYear" ||
            parsedPreset === "all"
          ? "annual"
          : "daily");

  if (input.forceAllHistory) {
    const earliest = await getEarliestAvailableDate(input.companyId, input.terminalId);
    return {
      preset: "all" as const,
      period: "annual" as const,
      from: earliest,
      to: normalizeEndOfDay(today),
    };
  }

  if (parsedPreset === "all") {
    const earliest = await getEarliestAvailableDate(input.companyId, input.terminalId);
    return {
      preset: "all" as const,
      period: "annual" as const,
      from: earliest,
      to: normalizeEndOfDay(today),
    };
  }

  if (parsedPreset === "lastYear") {
    const from = normalizeStartOfDay(new Date(today.getFullYear() - 1, 0, 1));
    const to = normalizeEndOfDay(new Date(today.getFullYear() - 1, 11, 31));
    return { preset: "lastYear" as const, period: "annual" as const, from, to };
  }

  if (parsedPreset === "thisYear") {
    const from = normalizeStartOfDay(new Date(today.getFullYear(), 0, 1));
    return { preset: "thisYear" as const, period: "annual" as const, from, to: normalizeEndOfDay(today) };
  }

  if (parsedPreset === "lastMonth") {
    const from = normalizeStartOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const to = normalizeEndOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
    return { preset: "lastMonth" as const, period: "monthly" as const, from, to };
  }

  if (parsedPreset === "thisMonth") {
    const from = normalizeStartOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    return { preset: "thisMonth" as const, period: "monthly" as const, from, to: normalizeEndOfDay(today) };
  }

  if (parsedPreset === "30d") {
    const from = normalizeStartOfDay(new Date(today));
    from.setDate(from.getDate() - 29);
    return { preset: "30d" as const, period: "monthly" as const, from, to: normalizeEndOfDay(today) };
  }

  if (parsedPreset === "7d") {
    const from = normalizeStartOfDay(new Date(today));
    from.setDate(from.getDate() - 6);
    return { preset: "7d" as const, period: "weekly" as const, from, to: normalizeEndOfDay(today) };
  }

  if (parsedPreset === "yesterday") {
    const value = new Date(today);
    value.setDate(value.getDate() - 1);
    return {
      preset: "yesterday" as const,
      period: "daily" as const,
      from: normalizeStartOfDay(value),
      to: normalizeEndOfDay(value),
    };
  }

  const customRange = parseCustomReportDateRange(input.from, input.to);
  if (customRange) {
    return {
      preset: "custom" as const,
      period: defaultPeriod,
      from: customRange.from,
      to: customRange.to,
    };
  }

  return {
    preset: "today" as const,
    period: "daily" as const,
    from: normalizeStartOfDay(today),
    to: normalizeEndOfDay(today),
  };
}

function formatDateInput(value: Date) {
  return formatReportDateInput(value);
}

function formatDateLabel(value: Date) {
  return formatReportDate(value);
}

export const reportPageService = {
  async loadOverview(searchParams: SearchParams = {}) {
    const viewer = await reportAccessService.getViewer();

    if (viewer.role === "admin") {
      const page = Number(getParam(searchParams, "page") ?? "0");
      const size = Number(getParam(searchParams, "size") ?? "10");
      const keyword = getParam(searchParams, "keyword") ?? "";
      const companies = await reportService.getAdminCompaniesWorkspace(viewer, {
        page: Number.isFinite(page) ? Math.max(0, page) : 0,
        size: Number.isFinite(size) ? Math.min(100, Math.max(1, size)) : 10,
        keyword,
      });

      return {
        viewer,
        mode: "admin" as const,
        companies,
      };
    }

    if (!viewer.companyId) {
      return {
        viewer,
        mode: "empty" as const,
      };
    }

    const range = await resolveDateRange({
      preset: getParam(searchParams, "preset"),
      period: getParam(searchParams, "period"),
      from: getParam(searchParams, "from"),
      to: getParam(searchParams, "to"),
      companyId: viewer.companyId,
    });
    const [workspace, overview] = await Promise.all([
      reportService.getWorkspace(viewer),
      reportService.getOverview(viewer, {
        companyId: viewer.companyId,
        from: range.from,
        to: range.to,
      }),
    ]);

    return {
      viewer,
      mode: "manager" as const,
      workspace,
      overview,
      range: {
        ...range,
        fromInput: formatDateInput(range.from),
        toInput: formatDateInput(range.to),
        label: `${formatDateLabel(range.from)} to ${formatDateLabel(range.to)}`,
      },
      quickLinks: REPORT_ROUTE_DEFINITIONS,
      todayLabel: formatDateLabel(new Date()),
    };
  },

  async loadReportPage(reportType: string, searchParams: SearchParams = {}) {
    const viewer = await reportAccessService.getViewer();
    const definition = getReportRouteDefinition(reportType);

    if (!definition) {
      return null;
    }

    const requestedCompanyId =
      getParam(searchParams, "companyId") ?? viewer.companyId;
    const companyId =
      viewer.role === "admin" ? requestedCompanyId : viewer.companyId;
    const terminalId = getParam(searchParams, "terminalId") ?? undefined;

    if (!companyId) {
      redirect("/reports");
    }

    const range = await resolveDateRange({
      preset: getParam(searchParams, "preset"),
      period: getParam(searchParams, "period"),
      from: getParam(searchParams, "from"),
      to: getParam(searchParams, "to"),
      companyId,
      terminalId,
      forceAllHistory: definition.view === "z-reading",
    });
    const page = Number(getParam(searchParams, "page") ?? "1");
    const requestedPageSize = Number(getParam(searchParams, "size") ?? "25");
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.min(5_000, Math.max(1, Math.trunc(requestedPageSize)))
      : 25;
    const sortOrder: ReportSortOrder =
      getParam(searchParams, "sortOrder") === "oldest" ? "oldest" : "newest";
    const keyword = getParam(searchParams, "keyword")?.trim() ?? "";
    const requestedStatus = getParam(searchParams, "status");
    const status = ["PAID", "VOID", "RETURNED", "CANCELLED"].includes(requestedStatus ?? "")
      ? (requestedStatus as "PAID" | "VOID" | "RETURNED" | "CANCELLED")
      : undefined;
    const branchId = getParam(searchParams, "branchId") ?? undefined;
    const cashierId = getParam(searchParams, "cashierId") ?? undefined;
    const input = {
      companyId,
      terminalId,
      from: range.from,
      to: range.to,
      page: Number.isFinite(page) ? Math.max(1, page) : 1,
      pageSize,
      sortOrder,
      keyword,
      status,
      branchId,
      cashierId,
    };

    const [workspace, overview, data] = await Promise.all([
      reportService.getWorkspace(viewer, { companyId }),
      definition.view === "transactions"
        ? Promise.resolve(null)
        : reportService.getOverview(viewer, {
            companyId,
            terminalId,
            from: range.from,
            to: range.to,
          }),
      (async (): Promise<LoadedReportData> => {
        switch (definition.view) {
      case "transactions":
        return reportService.getTransactionHistory(viewer, input);
      case "daily-transactions":
        return reportService.getDailyTransactions(viewer, input);
      case "debt-outstanding":
        return reportService.getDebtOutstanding(viewer, input);
      case "debt-collections":
        return reportService.getDebtCollections(viewer, input);
      case "invoice-documents":
        return reportService.getInvoiceDocuments(viewer, {
          ...input,
          documentType: getDocumentTypeParam(getParam(searchParams, "documentType")),
          trainMode: getTrainModeParam(getParam(searchParams, "trainMode")),
        });
      case "transaction-list":
        return reportService.getTransactionList(viewer, input);
      case "sales-book":
        return reportService.getSalesBook(viewer, input);
      case "product-profit":
        return reportService.getProductProfitReport(viewer, input);
      case "movement-velocity":
        return reportService.getProductVelocityReport(viewer, input);
      case "inventory-value":
        return reportService.getInventoryValueReport(viewer, input);
      case "revenue-goal":
        return reportService.getRevenueGoalReport(viewer, input);
      case "non-sales-income":
        return reportService.getNonSalesIncomeReport(viewer, input);
      case "x-reading":
        return reportService.getXReading(viewer, { companyId, terminalId, sortOrder });
      case "z-reading":
        return reportService.getZReading(viewer, input);
      case "audit":
        return reportService.getAuditTrail(viewer, input);
      case "voided-list":
        return reportService.getVoidedList(viewer, input);
      case "pwd-list":
        return reportService.getDiscountReport(viewer, { ...input, type: "PWD" });
      case "senior-list":
        return reportService.getDiscountReport(viewer, { ...input, type: "SENIOR" });
      case "dswd-list":
        return reportService.getDiscountReport(viewer, { ...input, type: "DSWD" });
      case "refund-invoices":
        return reportService.getRefundInvoices(viewer, input);
      case "returned-items":
        return reportService.getReturnedItems(viewer, input);
      case "returned-records":
        return reportService.getReturnedInvoiceRecords(viewer, input);
      default:
        redirect("/reports");
        }
      })(),
    ]);

    const selectedTerminal =
      workspace.terminals.find((item) => item.id === terminalId) ?? null;
    const printPayload =
      definition.view === "invoice-documents"
        ? null
        : reportPrintService.buildPayload({
            view: definition.view,
            overview: overview as NonNullable<typeof overview>,
            detail: data,
            selectedTerminal,
          });

    return {
      viewer,
      definition,
      workspace,
      overview: overview as NonNullable<typeof overview>,
      data,
      pagination: "pagination" in data ? data.pagination : null,
      scope: {
        companyId,
        terminalId,
        companyName: workspace.companyName,
        terminalName: selectedTerminal?.name ?? null,
      },
      selectedTerminal,
      range: {
        ...range,
        fromInput: formatDateInput(range.from),
        toInput: formatDateInput(range.to),
        label: `${formatDateLabel(range.from)} to ${formatDateLabel(range.to)}`,
        sortOrder,
        keyword,
        status,
        branchId,
        cashierId,
        documentType: getDocumentTypeParam(getParam(searchParams, "documentType")),
        trainMode: getTrainModeParam(getParam(searchParams, "trainMode")),
      },
      printPayload,
      isDateLockedToAllHistory: definition.view === "z-reading",
      isDateFilterOptional: definition.view === "x-reading",
      exportBaseUrl: `/reports/export?type=${definition.slug}&companyId=${companyId}${
        terminalId ? `&terminalId=${terminalId}` : ""
      }&period=${range.period}&preset=${range.preset}&from=${formatDateInput(range.from)}&to=${formatDateInput(range.to)}&sortOrder=${sortOrder}`,
    };
  },

  async loadExportData(searchParams: URLSearchParams) {
    const type = searchParams.get("type");
    const detail = await this.loadReportPage(type ?? "", {
      companyId: searchParams.get("companyId") ?? undefined,
      terminalId: searchParams.get("terminalId") ?? undefined,
      preset: searchParams.get("preset") ?? undefined,
      period: searchParams.get("period") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      cashierId: searchParams.get("cashierId") ?? undefined,
      page: "1",
      size: "5000",
    });

    if (!detail) {
      throw new Error("Report not found.");
    }

    return detail;
  },
};
