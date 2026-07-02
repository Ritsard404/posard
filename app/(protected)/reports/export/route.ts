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

const textEncoder = new TextEncoder();

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const format = reportFormatSchema.parse(url.searchParams.get("format") ?? "csv");
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

    if (format === "xlsx") {
      const buffer = reportExportService.buildXlsx(detail.definition.slug, detail.data);
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
          format,
          rowCount: summary.rowCount,
          columnCount: summary.columnCount,
          fileSize: buffer.byteLength,
        },
      });

      return new NextResponse(buffer, {
        headers: sensitiveDownloadHeaders({
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          filename: `${baseName}.xlsx`,
        }),
      });
    }

    const csv = reportExportService.buildCsv(detail.definition.slug, detail.data);
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
        format,
        rowCount: summary.rowCount,
        columnCount: summary.columnCount,
        fileSize: textEncoder.encode(csv).byteLength,
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
