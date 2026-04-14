"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { reportService } from "../_services/report.service";
import type {
  AuditTrailDto,
  DailyTransactionsDto,
  DiscountReportDto,
  RefundInvoicesDto,
  ReportInvoicePrintPayloadDto,
  ReportOverviewDto,
  ReportWorkspaceDto,
  ReportViewerDto,
  ReturnedInvoiceRecordsDto,
  ReturnedItemsDto,
  SalesReportDto,
  SalesBookDto,
  TransactionHistoryDto,
  TransactionListDto,
  VoidedListDto,
  XReadingDto,
  ZReadingDto,
} from "../_services/_dto/report.dto";

type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ReportInputSchema = z.object({
  companyId: z.string().uuid().optional(),
  terminalId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getReportViewer(): Promise<ReportViewerDto> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findFirst({
    where: {
      userId: data.user.id,
    },
    select: {
      id: true,
      companyId: true,
      role: true,
      fullName: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return {
    profileId: profile.id,
    companyId: profile.companyId,
    role: profile.role,
    fullName: profile.fullName,
  };
}

function resolveRange(input: z.infer<typeof ReportInputSchema>) {
  const from = reportService.normalizeStartOfDay(
    input.from ?? new Date(),
  );
  const to = reportService.normalizeEndOfDay(input.to ?? input.from ?? new Date());

  if (from > to) {
    throw new Error("Invalid report range.");
  }

  return { from, to };
}

function resolvePagination(input: z.infer<typeof ReportInputSchema>) {
  return {
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 25,
  };
}

export async function getReportOverviewAction(
  input?: unknown,
): Promise<DataResult<ReportOverviewDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const data = await reportService.getOverview(viewer, {
      ...validated,
      ...range,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load report overview"),
    };
  }
}

export async function getReportWorkspaceAction(
  input?: unknown,
): Promise<DataResult<ReportWorkspaceDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.pick({
      companyId: true,
    }).parse(input ?? {});
    const data = await reportService.getWorkspace(viewer, validated);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load report filters"),
    };
  }
}

export async function getXReadingAction(
  input?: unknown,
): Promise<DataResult<XReadingDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.pick({
      companyId: true,
      terminalId: true,
    }).parse(input ?? {});
    const data = await reportService.getXReading(viewer, validated);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load X-reading"),
    };
  }
}

export async function getZReadingAction(
  input?: unknown,
): Promise<DataResult<ZReadingDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const data = await reportService.getZReading(viewer, {
      ...validated,
      ...range,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load Z-reading"),
    };
  }
}

export async function getTransactionHistoryAction(
  input?: unknown,
): Promise<DataResult<TransactionHistoryDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getTransactionHistory(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load transaction history"),
    };
  }
}

export async function getAuditTrailAction(
  input?: unknown,
): Promise<DataResult<AuditTrailDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getAuditTrail(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load audit trail"),
    };
  }
}

export async function getDailyTransactionsAction(
  input?: unknown,
): Promise<DataResult<DailyTransactionsDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getDailyTransactions(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load daily transactions"),
    };
  }
}

export async function getTransactionListAction(
  input?: unknown,
): Promise<DataResult<TransactionListDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getTransactionList(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load transaction list"),
    };
  }
}

export async function getVoidedListAction(
  input?: unknown,
): Promise<DataResult<VoidedListDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getVoidedList(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load voided list"),
    };
  }
}

export async function getPwdDiscountReportAction(
  input?: unknown,
): Promise<DataResult<DiscountReportDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getDiscountReport(viewer, {
      ...validated,
      ...range,
      ...pagination,
      type: "PWD",
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load PWD report"),
    };
  }
}

export async function getSeniorDiscountReportAction(
  input?: unknown,
): Promise<DataResult<DiscountReportDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getDiscountReport(viewer, {
      ...validated,
      ...range,
      ...pagination,
      type: "SENIOR",
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load senior report"),
    };
  }
}

export async function getSalesReportAction(
  input?: unknown,
): Promise<DataResult<SalesReportDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getSalesReport(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load sales report"),
    };
  }
}

export async function getSalesBookAction(
  input?: unknown,
): Promise<DataResult<SalesBookDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getSalesBook(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load sales book"),
    };
  }
}

export async function getRefundInvoicesAction(
  input?: unknown,
): Promise<DataResult<RefundInvoicesDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getRefundInvoices(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load refund invoices"),
    };
  }
}

export async function getReturnedItemsAction(
  input?: unknown,
): Promise<DataResult<ReturnedItemsDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getReturnedItems(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load returned items"),
    };
  }
}

export async function getReturnedInvoiceRecordsAction(
  input?: unknown,
): Promise<DataResult<ReturnedInvoiceRecordsDto>> {
  try {
    const viewer = await getReportViewer();
    const validated = ReportInputSchema.parse(input ?? {});
    const range = resolveRange(validated);
    const pagination = resolvePagination(validated);
    const data = await reportService.getReturnedInvoiceRecords(viewer, {
      ...validated,
      ...range,
      ...pagination,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load returned invoice records"),
    };
  }
}

export async function getReportInvoicePrintPayloadAction(
  invoiceId: string,
): Promise<DataResult<ReportInvoicePrintPayloadDto>> {
  try {
    const viewer = await getReportViewer();
    const data = await reportService.getInvoicePrintPayload(viewer, invoiceId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load invoice print preview"),
    };
  }
}
