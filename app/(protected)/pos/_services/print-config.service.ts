import type { PrinterConfigDto } from "./_dto/print.dto";
import {
  deriveLegacyConnectionType,
  derivePrinterDriver,
  derivePrinterMode,
  derivePrinterTransport,
} from "./printer-mode.service";

interface PrinterConfigSource {
  printerName?: string | null;
  printerDisplayName?: string | null;
  printerConnectionType?: "usb" | "bluetooth" | "serial" | "built_in" | null;
  printerTransport?: "usb" | "bluetooth" | "built_in" | null;
  printerDriver?: "webusb" | "webbluetooth" | "webserial" | "sunmi_native" | null;
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
    const mode = derivePrinterMode({
      transport: source.printerTransport,
      driver: source.printerDriver,
      connectionType: source.printerConnectionType,
    });

    const config: PrinterConfigDto = {
      displayName,
      mode,
      transport: derivePrinterTransport({
        mode,
        transport:
          source.printerTransport === "built_in"
            ? "built-in"
            : source.printerTransport,
        connectionType: source.printerConnectionType,
      }),
      driver: derivePrinterDriver({
        mode,
        driver:
          source.printerDriver === "sunmi_native"
            ? "sunmi-native"
            : source.printerDriver,
        connectionType: source.printerConnectionType,
      }),
      connectionType: deriveLegacyConnectionType({
        mode,
        connectionType: source.printerConnectionType,
      }),
      vendorId: source.printerVendorId ?? null,
      productId: source.printerProductId ?? null,
      deviceId: cleanString(source.printerDeviceId),
      serviceUuid: cleanString(source.printerServiceUuid),
      characteristicUuid: cleanString(source.printerCharacteristicUuid),
      autoPrintEnabled: source.autoPrintEnabled ?? true,
    };

    const hasStructuredConfig =
      config.mode !== null ||
      config.transport !== null ||
      config.driver !== null ||
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
