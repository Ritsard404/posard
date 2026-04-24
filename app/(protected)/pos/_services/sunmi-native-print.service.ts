"use client";

import type {
  PrinterCapabilityDto,
  PrinterDeviceSummaryDto,
} from "./_dto/print.dto";
import { getPrinterModeMeta } from "./printer-mode.service";

type MaybePromise<T> = T | Promise<T>;

interface SunmiNativePrinterBridge {
  isAvailable(): MaybePromise<boolean>;
  printText(content: string): Promise<void>;
  testPrint(): Promise<void>;
  getDeviceInfo(): MaybePromise<{
    model: string;
    printerType: "sunmi-built-in";
  }>;
}

declare global {
  interface Window {
    __POSARD_SUNMI_PRINTER__?: SunmiNativePrinterBridge;
    POSARDSunmiPrinter?: SunmiNativePrinterBridge;
    SunmiPrinter?: SunmiNativePrinterBridge;
  }
}

function getBridge(): SunmiNativePrinterBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.__POSARD_SUNMI_PRINTER__ ??
    window.POSARDSunmiPrinter ??
    window.SunmiPrinter ??
    null
  );
}

async function assertAvailableBridge() {
  const bridge = getBridge();

  if (!bridge) {
    throw new Error(
      "Sunmi built-in printing is unavailable because no native bridge was detected in this runtime.",
    );
  }

  const available = await bridge.isAvailable();

  if (!available) {
    throw new Error(
      "The Sunmi native printer bridge is present but the built-in printer is not available.",
    );
  }

  return bridge;
}

export const sunmiNativePrintService = {
  getCapability(): PrinterCapabilityDto {
    const meta = getPrinterModeMeta("sunmi-built-in-native");
    const bridge = getBridge();

    return {
      mode: "sunmi-built-in-native",
      transport: meta.transport,
      driver: meta.driver,
      label: meta.label,
      description: meta.description,
      supported: Boolean(bridge),
      reason: bridge
        ? null
        : "Requires the Sunmi-enabled Android wrapper or native bridge.",
    };
  },

  async pair(): Promise<PrinterDeviceSummaryDto> {
    const bridge = await assertAvailableBridge();
    await bridge.testPrint();
    const deviceInfo = await bridge.getDeviceInfo();
    const meta = getPrinterModeMeta("sunmi-built-in-native");

    return {
      displayName: `${deviceInfo.model} Built-in Printer`,
      mode: "sunmi-built-in-native",
      transport: meta.transport,
      driver: meta.driver,
      connectionType: meta.connectionType,
      vendorId: null,
      productId: null,
      deviceId: "sunmi-built-in",
      serviceUuid: null,
      characteristicUuid: null,
    };
  },

  async printText(content: string) {
    const bridge = await assertAvailableBridge();
    await bridge.printText(content);
  },

  async testPrint() {
    const bridge = await assertAvailableBridge();
    await bridge.testPrint();
  },
};
