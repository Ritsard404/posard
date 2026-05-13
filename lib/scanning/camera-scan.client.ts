"use client";

import { isNativePlatform } from "@/src/lib/capacitor/platform";

import type { ScanResultDto } from "./scan.dto";

export const cameraScanService = {
  async scanBarcode(): Promise<ScanResultDto> {
    const {
      CapacitorBarcodeScanner,
      CapacitorBarcodeScannerAndroidScanningLibrary,
      CapacitorBarcodeScannerCameraDirection,
      CapacitorBarcodeScannerScanOrientation,
      CapacitorBarcodeScannerTypeHint,
    } = await import("@capacitor/barcode-scanner");

    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
      scanInstructions: "Point the camera at a barcode or QR code.",
      scanButton: false,
      scanText: "Scan",
      android: {
        scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING,
      },
      web: {
        showCameraSelection: true,
        scannerFPS: 30,
      },
    });

    return {
      value: result.ScanResult,
      kind: String(result.format).toLowerCase().includes("qr") ? "qr" : "barcode",
      source: isNativePlatform() ? "capacitor_camera" : "web_camera",
      format: String(result.format),
    };
  },
};
