export type ScanKind = "barcode" | "qr" | "nfc";
export type ScanSource = "hardware_keyboard" | "manual" | "web_camera" | "capacitor_camera" | "nfc";
export type ScanPermissionState = "granted" | "prompt" | "denied" | "blocked" | "unsupported" | "unknown";
export type DevicePlatform = "web" | "android" | "ios";

export interface ScanResultDto {
  value: string;
  kind: ScanKind;
  source: ScanSource;
  format?: string;
}

export interface DeviceCapabilityDto {
  platform: DevicePlatform;
  cameraBarcode: {
    supported: boolean;
    permission: ScanPermissionState;
    provider: "capacitor" | "web" | null;
    reason?: string;
  };
  hardwareKeyboardScanner: {
    supported: boolean;
  };
  nfc: {
    supported: boolean;
    permission: ScanPermissionState;
    provider: "web_nfc" | "native_future" | null;
    reason?: string;
  };
}
