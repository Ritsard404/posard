import { NextResponse } from "next/server";
import { reportExportService } from "../_services/report-export.service";
import { reportPageService } from "../_services/report-page.service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    const detail = await reportPageService.loadExportData(url.searchParams);
    const dateSuffix = new Date().toISOString().slice(0, 10);
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
  } catch {
    return NextResponse.json(
      { error: "Unable to export this report right now." },
      { status: 400 },
    );
  }
}

