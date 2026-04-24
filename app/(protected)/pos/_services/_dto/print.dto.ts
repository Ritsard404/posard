export type PrinterTransport = "usb" | "bluetooth" | "built-in";

export type PrinterDriver =
  | "webusb"
  | "webbluetooth"
  | "webserial"
  | "sunmi-native";

export type PrinterMode =
  | "usb-web"
  | "bluetooth-ble-web"
  | "bluetooth-serial-web"
  | "sunmi-built-in-native";

export type LegacyPrinterConnectionType =
  | "usb"
  | "bluetooth"
  | "serial"
  | "built_in";

export interface PrinterConfigDto {
  displayName: string | null;
  mode: PrinterMode | null;
  transport: PrinterTransport | null;
  driver: PrinterDriver | null;
  connectionType: LegacyPrinterConnectionType | null;
  vendorId: number | null;
  productId: number | null;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
  autoPrintEnabled: boolean;
}

export interface PrinterDeviceSummaryDto {
  displayName: string;
  mode: PrinterMode;
  transport: PrinterTransport;
  driver: PrinterDriver;
  connectionType: LegacyPrinterConnectionType;
  vendorId: number | null;
  productId: number | null;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
}

export interface PrinterCapabilityDto {
  mode: PrinterMode;
  transport: PrinterTransport;
  driver: PrinterDriver;
  label: string;
  description: string;
  supported: boolean;
  reason: string | null;
}

export type PrintIntent =
  | "receipt"
  | "cash-in"
  | "cash-out"
  | "report"
  | "x-reading"
  | "z-reading"
  | "report-invoice";

export interface PrintJobDto {
  title: string;
  intent: PrintIntent;
  previewContent: string;
  printSegments?: string[];
  printerConfig: PrinterConfigDto | null;
}

export interface PrintJobResultDto {
  status: "printed" | "previewed" | "unsupported" | "failed";
  message: string;
}
