import "server-only";

import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import type { PrinterConfigDto } from "./_dto/print.dto";

function toLegacyPrinterName(config: PrinterConfigDto | null) {
  return config?.displayName?.trim() || "";
}

function serializePrinterConfig(config: PrinterConfigDto | null) {
  if (!config) {
    return null;
  }

  return {
    displayName: config.displayName,
    mode: config.mode,
    transport: config.transport,
    driver: config.driver,
    connectionType: config.connectionType,
    vendorId: config.vendorId,
    productId: config.productId,
    deviceId: config.deviceId,
    serviceUuid: config.serviceUuid,
    characteristicUuid: config.characteristicUuid,
    autoPrintEnabled: config.autoPrintEnabled,
  };
}

function mapTerminalPrinterConfig(terminal: {
  printerDisplayName: string | null;
  printerConnectionType: string | null;
  printerTransport: string | null;
  printerDriver: string | null;
  printerVendorId: number | null;
  printerProductId: number | null;
  printerDeviceId: string | null;
  printerServiceUuid: string | null;
  printerCharacteristicUuid: string | null;
  autoPrintEnabled: boolean;
}) {
  return {
    displayName: terminal.printerDisplayName,
    connectionType: terminal.printerConnectionType,
    transport: terminal.printerTransport,
    driver: terminal.printerDriver,
    vendorId: terminal.printerVendorId,
    productId: terminal.printerProductId,
    deviceId: terminal.printerDeviceId,
    serviceUuid: terminal.printerServiceUuid,
    characteristicUuid: terminal.printerCharacteristicUuid,
    autoPrintEnabled: terminal.autoPrintEnabled,
  };
}

export const terminalPrinterConfigService = {
  async updateTerminalPrinterConfig(
    terminalId: string,
    printerConfig: PrinterConfigDto | null,
    auditContext?: {
      companyId: string;
      actorProfileId: string;
      timestampId?: string | null;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const before = auditContext
        ? await tx.posTerminalInfo.findUnique({
            where: { id: terminalId },
            select: {
              printerDisplayName: true,
              printerConnectionType: true,
              printerTransport: true,
              printerDriver: true,
              printerVendorId: true,
              printerProductId: true,
              printerDeviceId: true,
              printerServiceUuid: true,
              printerCharacteristicUuid: true,
              autoPrintEnabled: true,
            },
          })
        : null;

      const terminal = await tx.posTerminalInfo.update({
        where: { id: terminalId },
        data: {
          printerName: toLegacyPrinterName(printerConfig),
          printerDisplayName: printerConfig?.displayName ?? null,
          printerConnectionType: (printerConfig?.connectionType ?? null) as never,
          printerTransport: (
            printerConfig?.transport === "built-in"
              ? "built_in"
              : (printerConfig?.transport ?? null)
          ) as never,
          printerDriver: (printerConfig?.driver?.replace("-", "_") ?? null) as never,
          printerVendorId: printerConfig?.vendorId ?? null,
          printerProductId: printerConfig?.productId ?? null,
          printerDeviceId: printerConfig?.deviceId ?? null,
          printerServiceUuid: printerConfig?.serviceUuid ?? null,
          printerCharacteristicUuid: printerConfig?.characteristicUuid ?? null,
          autoPrintEnabled: printerConfig?.autoPrintEnabled ?? true,
        },
      });

      if (auditContext) {
        await auditLogService.create(tx, {
          companyId: auditContext.companyId,
          actorProfileId: auditContext.actorProfileId,
          posTerminalId: terminalId,
          actionType: "TERMINAL_PRINTER_CONFIG_UPDATED",
          referenceId: auditContext.timestampId ?? terminalId,
          changes: JSON.stringify({
            before: before ? mapTerminalPrinterConfig(before) : null,
            after: serializePrinterConfig(printerConfig),
          }),
        });
      }

      return terminal;
    });
  },
};
