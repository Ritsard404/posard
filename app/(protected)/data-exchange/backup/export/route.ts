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

function getBackupRowCounts(backup: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(backup)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, (value as unknown[]).length]),
  );
}

export async function GET() {
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

    const backup = await dataExchangeService.buildBackup();
    const json = JSON.stringify(backup, null, 2);
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const tableCounts = getBackupRowCounts(backup as Record<string, unknown>);
    const rowCount = Object.values(tableCounts).reduce((sum, value) => sum + value, 0);
    const fileSize = textEncoder.encode(json).byteLength;

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
        rowCount,
        fileSize,
        tableCounts,
      },
    });

    return new Response(json, {
      headers: sensitiveDownloadHeaders({
        contentType: "application/json",
        filename: `posard-backup-${dateSuffix}.json`,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return rateLimitErrorResponse(error.message);
    }

    return invalidPayloadResponse("Unable to export backup right now.");
  }
}
