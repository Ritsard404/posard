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
import { spreadsheetXmlContentType } from "@/lib/export/spreadsheet-xml";

const textEncoder = new TextEncoder();
const PRODUCT_CATALOG_EXPORT_ROW_LIMIT = 10_000;

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
    const requestedFormat = url.searchParams.get("format") ?? "xls";
    const format = requestedFormat === "pdf" ? "pdf" : "xls";
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
    if (rowCount > PRODUCT_CATALOG_EXPORT_ROW_LIMIT) {
      return invalidPayloadResponse(
        `Product catalog exports are limited to ${PRODUCT_CATALOG_EXPORT_ROW_LIMIT.toLocaleString()} rows per file.`,
      );
    }

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

    const workbook = await dataExchangeService.buildProductCatalogSpreadsheet();
    const fileSize = textEncoder.encode(workbook).byteLength;
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
          requestedFormat,
          rowCount,
          fileSize,
      },
    });

    return new Response(workbook, {
      headers: sensitiveDownloadHeaders({
        contentType: spreadsheetXmlContentType,
        filename: `product-catalog-${dateSuffix}.xls`,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return rateLimitErrorResponse(error.message);
    }

    return invalidPayloadResponse("Unable to export product catalog right now.");
  }
}
