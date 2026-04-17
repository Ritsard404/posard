export type PrinterConnectionType = "usb" | "bluetooth";

export interface PrinterConfigDto {
  displayName: string | null;
  connectionType: PrinterConnectionType | null;
  vendorId: number | null;
  productId: number | null;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
  autoPrintEnabled: boolean;
}

export interface PrinterDeviceSummaryDto {
  displayName: string;
  connectionType: PrinterConnectionType;
  vendorId: number | null;
  productId: number | null;
  deviceId: string | null;
  serviceUuid: string | null;
  characteristicUuid: string | null;
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
