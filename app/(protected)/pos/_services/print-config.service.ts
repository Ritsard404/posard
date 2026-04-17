import type { PrinterConfigDto } from "./_dto/print.dto";

interface PrinterConfigSource {
  printerName?: string | null;
  printerDisplayName?: string | null;
  printerConnectionType?: "usb" | "bluetooth" | null;
  printerVendorId?: number | null;
  printerProductId?: number | null;
  printerDeviceId?: string | null;
  printerServiceUuid?: string | null;
  printerCharacteristicUuid?: string | null;
  autoPrintEnabled?: boolean | null;
}

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const printConfigService = {
  mapPrinterConfig(source: PrinterConfigSource): PrinterConfigDto | null {
    const displayName =
      cleanString(source.printerDisplayName) ?? cleanString(source.printerName);

    const config: PrinterConfigDto = {
      displayName,
      connectionType: source.printerConnectionType ?? null,
      vendorId: source.printerVendorId ?? null,
      productId: source.printerProductId ?? null,
      deviceId: cleanString(source.printerDeviceId),
      serviceUuid: cleanString(source.printerServiceUuid),
      characteristicUuid: cleanString(source.printerCharacteristicUuid),
      autoPrintEnabled: source.autoPrintEnabled ?? true,
    };

    const hasStructuredConfig =
      config.connectionType !== null ||
      config.vendorId !== null ||
      config.productId !== null ||
      config.deviceId !== null ||
      config.serviceUuid !== null ||
      config.characteristicUuid !== null;

    if (!config.displayName && !hasStructuredConfig) {
      return null;
    }

    return config;
  },
};
