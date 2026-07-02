import { dataExchangeService } from "../../_services/data-exchange.service";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { auditSecurityEventBestEffort } from "@/lib/security/audit-security";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import {
  forbiddenResponse,
  invalidPayloadResponse,
  rateLimitErrorResponse,
  sensitiveDownloadHeaders,
  unauthorizedResponse,
} from "@/lib/security/response";

const textEncoder = new TextEncoder();

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return unauthorizedResponse();
    }

    if (profile.role === "cashier") {
      return forbiddenResponse("Manager access is required.");
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
    await enforceRateLimit({
      bucket: "dataExport",
      route: "/data-exchange/product-catalog/export",
      action: "PRODUCT_CATALOG_EXPORT",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
    });
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const rowCount = await dataExchangeService.countProductCatalogExportRows(format);

    if (format === "pdf") {
      const pdf = await dataExchangeService.buildProductCatalogPdf();
      const fileSize = textEncoder.encode(pdf).byteLength;
      await auditSecurityEventBestEffort({
        action: "PRODUCT_CATALOG_EXPORT",
        route: "/data-exchange/product-catalog/export",
        result: "allowed",
        reasonCode: "EXPORT_COMPLETED",
        userId: profile.id,
        actorProfileId: profile.id,
        role: profile.role,
        companyId: profile.companyId,
        metadata: {
          exportType: "product-catalog",
          format,
          rowCount,
          fileSize,
        },
      });

      return new Response(pdf, {
        headers: sensitiveDownloadHeaders({
          contentType: "application/pdf",
          filename: `product-catalog-${dateSuffix}.pdf`,
        }),
      });
    }

    const workbook = await dataExchangeService.buildProductCatalogWorkbook();
    const body = new Uint8Array(workbook);
    await auditSecurityEventBestEffort({
      action: "PRODUCT_CATALOG_EXPORT",
      route: "/data-exchange/product-catalog/export",
      result: "allowed",
      reasonCode: "EXPORT_COMPLETED",
      userId: profile.id,
      actorProfileId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
      metadata: {
        exportType: "product-catalog",
        format,
        rowCount,
        fileSize: body.byteLength,
      },
    });

    return new Response(body, {
      headers: sensitiveDownloadHeaders({
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `product-catalog-${dateSuffix}.xlsx`,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return rateLimitErrorResponse(error.message);
    }

    return invalidPayloadResponse("Unable to export product catalog right now.");
  }
}
