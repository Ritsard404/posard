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

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return unauthorizedResponse();
    }

    if (profile.role === "cashier") {
      return forbiddenResponse("Manager access is required.");
    }

    await enforceRateLimit({
      bucket: "dataExport",
      route: "/data-exchange/backup/export",
      action: "DATA_BACKUP_EXPORT",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
    });

    const url = new URL(request.url);
    const includeSensitive = url.searchParams.get("scope") === "full";
    if (includeSensitive && profile.role !== "admin") {
      return forbiddenResponse("Full administrative backup requires admin access.");
    }

    const { stream, tableCounts } = await dataExchangeService.buildBackupStream({
      includeSensitive,
    });
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const rowCount = Object.values(tableCounts).reduce((sum, value) => sum + value, 0);

    await auditSecurityEventBestEffort({
      action: "DATA_BACKUP_EXPORT",
      route: "/data-exchange/backup/export",
      result: "allowed",
      reasonCode: "EXPORT_COMPLETED",
      userId: profile.id,
      actorProfileId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
      metadata: {
        exportType: "backup",
        format: "json",
        scope: includeSensitive ? "full-admin" : "operational",
        rowCount,
        fileSize: null,
        tableCounts,
      },
    });

    return new Response(stream, {
      headers: sensitiveDownloadHeaders({
        contentType: "application/json",
        filename: `posard-backup-${includeSensitive ? "full-" : ""}${dateSuffix}.json`,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return rateLimitErrorResponse(error.message);
    }

    return invalidPayloadResponse("Unable to export backup right now.");
  }
}
