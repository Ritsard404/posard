import { NextResponse } from "next/server";
import { reportExportService } from "../_services/report-export.service";
import { reportPageService } from "../_services/report-page.service";
import { formatReportDateInput } from "@/lib/report-date-format";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { auditSecurityEventBestEffort } from "@/lib/security/audit-security";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import {
  invalidPayloadResponse,
  rateLimitErrorResponse,
  sensitiveDownloadHeaders,
} from "@/lib/security/response";
import { reportFormatSchema } from "@/lib/validators/common";
import { spreadsheetXmlContentType } from "@/lib/export/spreadsheet-xml";

const textEncoder = new TextEncoder();
const MAX_REPORT_EXPORT_DAYS = 366;
const MAX_REPORT_EXPORT_ROWS = 5_000;
const MAX_REPORT_EXPORT_BYTES = 10 * 1024 * 1024;

function getRangeDays(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return 1;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return 1;
  }

  return Math.ceil(Math.abs(toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    if (getRangeDays(url) > MAX_REPORT_EXPORT_DAYS) {
      return invalidPayloadResponse("Report exports are limited to one year per file.");
    }

    const format = reportFormatSchema.parse(url.searchParams.get("format") ?? "csv");
    const normalizedFormat = format === "xlsx" ? "xls" : format;
    await enforceRateLimit({
      bucket: "exportReport",
      route: "/reports/export",
      action: "REPORT_EXPORT",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: url.searchParams.get("companyId") ?? profile.companyId,
      terminalId: url.searchParams.get("terminalId"),
    });
    const detail = await reportPageService.loadExportData(url.searchParams);
    const dateSuffix = formatReportDateInput(new Date());
    const baseName = `${detail.definition.slug}-report-${dateSuffix}`;
    const summary = reportExportService.describe(detail.definition.slug, detail.data);
    if (summary.rowCount > MAX_REPORT_EXPORT_ROWS) {
      return invalidPayloadResponse(
        `Report exports are limited to ${MAX_REPORT_EXPORT_ROWS.toLocaleString()} rows per file.`,
      );
    }

    if (normalizedFormat === "xls") {
      const workbookXml = reportExportService.buildSpreadsheet(detail.definition.slug, detail.data);
      const fileSize = textEncoder.encode(workbookXml).byteLength;
      if (fileSize > MAX_REPORT_EXPORT_BYTES) {
        return invalidPayloadResponse("Report export file is too large. Narrow the date range and try again.");
      }
      await auditSecurityEventBestEffort({
        action: "REPORT_EXPORT",
        route: "/reports/export",
        result: "allowed",
        reasonCode: "EXPORT_COMPLETED",
        userId: profile.id,
        actorProfileId: profile.id,
        role: profile.role,
        companyId: detail.scope.companyId,
        terminalId: detail.scope.terminalId,
        metadata: {
          exportType: "report",
          reportSlug: detail.definition.slug,
          format: normalizedFormat,
          requestedFormat: format,
          rowCount: summary.rowCount,
          columnCount: summary.columnCount,
          fileSize,
        },
      });

      return new NextResponse(workbookXml, {
        headers: sensitiveDownloadHeaders({
          contentType: spreadsheetXmlContentType,
          filename: `${baseName}.xls`,
        }),
      });
    }

    const csv = reportExportService.buildCsv(detail.definition.slug, detail.data);
    const csvSize = textEncoder.encode(csv).byteLength;
    if (csvSize > MAX_REPORT_EXPORT_BYTES) {
      return invalidPayloadResponse("Report export file is too large. Narrow the date range and try again.");
    }

    await auditSecurityEventBestEffort({
      action: "REPORT_EXPORT",
      route: "/reports/export",
      result: "allowed",
      reasonCode: "EXPORT_COMPLETED",
      userId: profile.id,
      actorProfileId: profile.id,
      role: profile.role,
      companyId: detail.scope.companyId,
      terminalId: detail.scope.terminalId,
      metadata: {
        exportType: "report",
        reportSlug: detail.definition.slug,
        format: normalizedFormat,
        rowCount: summary.rowCount,
        columnCount: summary.columnCount,
        fileSize: csvSize,
      },
    });

    return new NextResponse(csv, {
      headers: sensitiveDownloadHeaders({
        contentType: "text/csv; charset=utf-8",
        filename: `${baseName}.csv`,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return rateLimitErrorResponse(error.message);
    }

    return invalidPayloadResponse("Unable to export this report right now.");
  }
}
