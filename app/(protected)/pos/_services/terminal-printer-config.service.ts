import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrinterConfigDto } from "./_dto/print.dto";

function toLegacyPrinterName(config: PrinterConfigDto | null) {
  return config?.displayName?.trim() || "";
}

export const terminalPrinterConfigService = {
  async updateTerminalPrinterConfig(
    terminalId: string,
    printerConfig: PrinterConfigDto | null,
  ) {
    return prisma.posTerminalInfo.update({
      where: { id: terminalId },
      data: {
        printerName: toLegacyPrinterName(printerConfig),
        printerDisplayName: printerConfig?.displayName ?? null,
        printerConnectionType: printerConfig?.connectionType ?? null,
        printerVendorId: printerConfig?.vendorId ?? null,
        printerProductId: printerConfig?.productId ?? null,
        printerDeviceId: printerConfig?.deviceId ?? null,
        printerServiceUuid: printerConfig?.serviceUuid ?? null,
        printerCharacteristicUuid: printerConfig?.characteristicUuid ?? null,
        autoPrintEnabled: printerConfig?.autoPrintEnabled ?? true,
      },
    });
  },
};
