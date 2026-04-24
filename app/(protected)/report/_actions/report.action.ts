"use server";

import { InvoiceDocumentType } from "@prisma/client";
import { z } from "zod";
import { reportService } from "../_services/report.service";
import { reportAccessService } from "../_services/report-access.service";
import type { PrinterConfigDto } from "@/app/(protected)/pos/_services/_dto/print.dto";
import { terminalPrinterConfigService } from "@/app/(protected)/pos/_services/terminal-printer-config.service";
import { printArchiveService } from "@/app/(protected)/pos/_services/print-archive.service";
import { revalidatePath } from "next/cache";
import type {
  AuditTrailDto,
  DailyTransactionsDto,
  DiscountReportDto,
  RefundInvoicesDto,
  ReportCompaniesWorkspaceDto,
  ReportCompanyContextDto,
  ReportInvoicePrintPayloadDto,
  ReportOverviewDto,
  ReportTerminalContextDto,
  ReportWorkspaceDto,
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

const ReportWorkspaceInputSchema = ReportInputSchema.pick({
  companyId: true,
});

const ReportCompanyContextInputSchema = z.object({
  companyId: z.string().uuid(),
});

const ReportTerminalContextInputSchema = z.object({
  companyId: z.string().uuid(),
  terminalId: z.string().uuid(),
});

const ReportCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
  keyword: z.string().trim().optional(),
});

const PrinterConfigSchema = z.object({
  displayName: z.string().trim().min(1).nullable(),
  mode: z
    .enum([
      "usb-web",
      "bluetooth-ble-web",
      "bluetooth-serial-web",
      "sunmi-built-in-native",
    ])
    .nullable(),
  transport: z.enum(["usb", "bluetooth", "built-in"]).nullable(),
  driver: z
    .enum(["webusb", "webbluetooth", "webserial", "sunmi-native"])
    .nullable(),
  connectionType: z.enum(["usb", "bluetooth", "serial", "built_in"]).nullable(),
  vendorId: z.number().int().nullable(),
  productId: z.number().int().nullable(),
  deviceId: z.string().trim().nullable(),
  serviceUuid: z.string().trim().nullable(),
  characteristicUuid: z.string().trim().nullable(),
  autoPrintEnabled: z.boolean(),
});

const PrintArchiveTypeSchema = z.nativeEnum(InvoiceDocumentType).refine(
  (value) => value === InvoiceDocumentType.XREPORT || value === InvoiceDocumentType.ZREPORT,
  "Unsupported archive type",
);

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
    const validated = ReportWorkspaceInputSchema.parse(input ?? {});
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
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
    const viewer = await reportAccessService.getViewer();
    const data = await reportService.getInvoicePrintPayload(viewer, invoiceId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load invoice print preview"),
    };
  }
}

export async function createReportPrintArchiveAction(input: {
  type: "XREPORT" | "ZREPORT";
  content: string;
  isTrainMode: boolean;
}): Promise<
  | { success: true; data: { documentId: string; content: string } }
  | { success: false; error: string }
> {
  try {
    await reportAccessService.getViewer();
    const validated = z.object({
      type: PrintArchiveTypeSchema,
      content: z.string().min(1),
      isTrainMode: z.boolean(),
    }).parse(input);

    const archive = await printArchiveService.createArchive({
      type: validated.type,
      content: validated.content,
      isTrainMode: validated.isTrainMode,
    });

    return {
      success: true,
      data: {
        documentId: archive.id,
        content: archive.content,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to create print archive"),
    };
  }
}

export async function reprintReportPrintArchiveAction(input: {
  documentId: string;
  type: "XREPORT" | "ZREPORT";
}): Promise<
  | { success: true; data: { documentId: string; content: string } }
  | { success: false; error: string }
> {
  try {
    await reportAccessService.getViewer();
    const validated = z.object({
      documentId: z.string().uuid(),
      type: PrintArchiveTypeSchema,
    }).parse(input);

    const archive = await printArchiveService.createReprint(
      validated.documentId,
      validated.type,
    );

    return {
      success: true,
      data: {
        documentId: archive.id,
        content: archive.content,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to reprint archived report"),
    };
  }
}

export async function getAdminReportCompaniesAction(
  input?: unknown,
): Promise<DataResult<ReportCompaniesWorkspaceDto>> {
  try {
    const viewer = await reportAccessService.getViewer();
    const validated = ReportCompaniesQuerySchema.parse(input ?? {});
    const data = await reportService.getAdminCompaniesWorkspace(viewer, {
      page: validated.page ?? 0,
      size: validated.size ?? 10,
      keyword: validated.keyword ?? "",
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load report companies"),
    };
  }
}

export async function getReportCompanyContextAction(
  input: unknown,
): Promise<DataResult<ReportCompanyContextDto>> {
  try {
    const viewer = await reportAccessService.getViewer();
    const validated = ReportCompanyContextInputSchema.parse(input);
    const data = await reportService.getCompanyContext(viewer, validated.companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load company report context"),
    };
  }
}

export async function getReportTerminalContextAction(
  input: unknown,
): Promise<DataResult<ReportTerminalContextDto>> {
  try {
    const viewer = await reportAccessService.getViewer();
    const validated = ReportTerminalContextInputSchema.parse(input);
    const data = await reportService.getTerminalContext(
      viewer,
      validated.companyId,
      validated.terminalId,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to load terminal report context"),
    };
  }
}

export async function saveReportTerminalPrinterConfigAction(input: {
  companyId: string;
  terminalId: string;
  printerConfig: PrinterConfigDto | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const viewer = await reportAccessService.getViewer();
    const validated = z.object({
      companyId: z.string().uuid(),
      terminalId: z.string().uuid(),
      printerConfig: PrinterConfigSchema.nullable(),
    }).parse(input);

    await reportService.getTerminalContext(
      viewer,
      validated.companyId,
      validated.terminalId,
    );

    await terminalPrinterConfigService.updateTerminalPrinterConfig(
      validated.terminalId,
      validated.printerConfig,
    );

    revalidatePath("/report");
    revalidatePath(`/companies/${validated.companyId}/report`);
    revalidatePath(`/companies/${validated.companyId}/terminals/${validated.terminalId}/report`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, "Failed to save printer configuration"),
    };
  }
}
