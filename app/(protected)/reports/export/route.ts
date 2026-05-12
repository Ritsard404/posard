import { NextResponse } from "next/server";
import { reportExportService } from "../_services/report-export.service";
import { reportPageService } from "../_services/report-page.service";
import { formatReportDateInput } from "@/lib/report-date-format";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { invalidPayloadResponse } from "@/lib/security/response";
import { reportFormatSchema } from "@/lib/validators/common";

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

    if (format === "xlsx") {
      const buffer = reportExportService.buildXlsx(detail.definition.slug, detail.data);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
        },
      });
    }

    const csv = reportExportService.buildCsv(detail.definition.slug, detail.data);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return invalidPayloadResponse("Unable to export this report right now.");
  }
}
