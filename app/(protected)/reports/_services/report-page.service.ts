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
import {
  getReportRouteDefinition,
  REPORT_ROUTE_DEFINITIONS,
  type ReportPreset,
} from "../_components/reports-config";
import type { ReportSortOrder } from "@/app/(protected)/report/_components/report-workspace-config";

type SearchParams = Record<string, string | string[] | undefined>;
export type LoadedReportData =
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

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
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
  from?: string | null;
  to?: string | null;
  companyId: string;
  terminalId?: string;
  forceAllHistory?: boolean;
}) {
  const today = new Date();
  const parsedPreset = input.preset as ReportPreset | null;

  if (input.forceAllHistory) {
    const earliest = await getEarliestAvailableDate(input.companyId, input.terminalId);
    return {
      preset: "all" as const,
      from: earliest,
      to: normalizeEndOfDay(today),
    };
  }

  if (parsedPreset === "all") {
    const earliest = await getEarliestAvailableDate(input.companyId, input.terminalId);
    return {
      preset: "all" as const,
      from: earliest,
      to: normalizeEndOfDay(today),
    };
  }

  if (parsedPreset === "30d") {
    const from = normalizeStartOfDay(new Date(today));
    from.setDate(from.getDate() - 29);
    return { preset: "30d" as const, from, to: normalizeEndOfDay(today) };
  }

  if (parsedPreset === "7d") {
    const from = normalizeStartOfDay(new Date(today));
    from.setDate(from.getDate() - 6);
    return { preset: "7d" as const, from, to: normalizeEndOfDay(today) };
  }

  if (
    input.from &&
    input.to &&
    !Number.isNaN(new Date(input.from).getTime()) &&
    !Number.isNaN(new Date(input.to).getTime())
  ) {
    return {
      preset: "custom" as const,
      from: normalizeStartOfDay(new Date(input.from)),
      to: normalizeEndOfDay(new Date(input.to)),
    };
  }

  return {
    preset: "today" as const,
    from: normalizeStartOfDay(today),
    to: normalizeEndOfDay(today),
  };
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
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
      from: getParam(searchParams, "from"),
      to: getParam(searchParams, "to"),
      companyId: viewer.companyId,
    });
    const workspace = await reportService.getWorkspace(viewer);
    const overview = await reportService.getOverview(viewer, {
      companyId: viewer.companyId,
      from: range.from,
      to: range.to,
    });

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

    const companyId = getParam(searchParams, "companyId") ?? viewer.companyId;
    const terminalId = getParam(searchParams, "terminalId") ?? undefined;

    if (!companyId) {
      redirect("/reports");
    }

    const range = await resolveDateRange({
      preset: getParam(searchParams, "preset"),
      from: getParam(searchParams, "from"),
      to: getParam(searchParams, "to"),
      companyId,
      terminalId,
      forceAllHistory: definition.view === "z-reading",
    });
    const page = Number(getParam(searchParams, "page") ?? "1");
    const pageSize = 25;
    const sortOrder: ReportSortOrder =
      getParam(searchParams, "sortOrder") === "oldest" ? "oldest" : "newest";
    const workspace = await reportService.getWorkspace(viewer, { companyId });
    const overview = await reportService.getOverview(viewer, {
      companyId,
      terminalId,
      from: range.from,
      to: range.to,
    });

    const input = {
      companyId,
      terminalId,
      from: range.from,
      to: range.to,
      page: Number.isFinite(page) ? Math.max(1, page) : 1,
      pageSize,
      sortOrder,
    };

    let data: LoadedReportData;

    switch (definition.view) {
      case "transactions":
        data = await reportService.getTransactionHistory(viewer, input);
        break;
      case "daily-transactions":
        data = await reportService.getDailyTransactions(viewer, input);
        break;
      case "debt-outstanding":
        data = await reportService.getDebtOutstanding(viewer, input);
        break;
      case "debt-collections":
        data = await reportService.getDebtCollections(viewer, input);
        break;
      case "transaction-list":
        data = await reportService.getTransactionList(viewer, input);
        break;
      case "sales-book":
        data = await reportService.getSalesBook(viewer, input);
        break;
      case "x-reading":
        data = await reportService.getXReading(viewer, { companyId, terminalId, sortOrder });
        break;
      case "z-reading":
        data = await reportService.getZReading(viewer, input);
        break;
      case "audit":
        data = await reportService.getAuditTrail(viewer, input);
        break;
      case "voided-list":
        data = await reportService.getVoidedList(viewer, input);
        break;
      case "pwd-list":
        data = await reportService.getDiscountReport(viewer, { ...input, type: "PWD" });
        break;
      case "refund-invoices":
        data = await reportService.getRefundInvoices(viewer, input);
        break;
      case "returned-items":
        data = await reportService.getReturnedItems(viewer, input);
        break;
      case "returned-records":
        data = await reportService.getReturnedInvoiceRecords(viewer, input);
        break;
      default:
        redirect("/reports");
    }

    const selectedTerminal =
      workspace.terminals.find((item) => item.id === terminalId) ?? null;
    const printPayload = reportPrintService.buildPayload({
      view: definition.view,
      overview,
      detail: data,
      selectedTerminal,
    });

    return {
      viewer,
      definition,
      workspace,
      overview,
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
      },
      printPayload,
      isDateLockedToAllHistory: definition.view === "z-reading",
      isDateFilterOptional: definition.view === "x-reading",
      exportBaseUrl: `/reports/export?type=${definition.slug}&companyId=${companyId}${
        terminalId ? `&terminalId=${terminalId}` : ""
      }&preset=${range.preset}&from=${formatDateInput(range.from)}&to=${formatDateInput(range.to)}&sortOrder=${sortOrder}`,
    };
  },

  async loadExportData(searchParams: URLSearchParams) {
    const type = searchParams.get("type");
    const detail = await this.loadReportPage(type ?? "", {
      companyId: searchParams.get("companyId") ?? undefined,
      terminalId: searchParams.get("terminalId") ?? undefined,
      preset: searchParams.get("preset") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      page: "1",
    });

    if (!detail) {
      throw new Error("Report not found.");
    }

    return detail;
  },
};
