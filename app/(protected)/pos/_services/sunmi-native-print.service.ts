"use client";
import type {
  PrinterCapabilityDto,
  PrinterDeviceSummaryDto,
} from "./_dto/print.dto";
import { getPrinterModeMeta } from "./printer-mode.service";
import {
  getPlatform,
  isCapacitorPluginAvailable,
  isNativePlatform,
} from "@/src/lib/capacitor/platform";
import { getReceiptLogoBase64Png } from "./receipt-logo-raster.client";

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

interface SunmiPrinterPlugin {
  isAvailable(): Promise<{
    available: boolean;
    connected: boolean;
    model: string;
  }>;
  printReceipt(options: { segments: string[]; logoBase64Png?: string | null }): Promise<{
    success?: boolean;
    segmentsPrinted?: number;
  }>;
  printText(options: { content: string }): Promise<{
    success?: boolean;
    code?: number;
    message?: string;
  }>;
  testPrint(): Promise<{
    success?: boolean;
    code?: number;
    message?: string;
  }>;
  getDeviceInfo(): Promise<{
    model: string;
    printerType: "sunmi-built-in";
    printerModel?: string;
    printerVersion?: string;
    printerSerialNo?: string;
    serviceVersion?: string;
    paperWidth?: string;
    statusCode?: number;
  }>;
}

export interface SunmiNativePrinterDiagnostics {
  available: boolean;
  connected: boolean;
  model: string;
  printerType: "sunmi-built-in";
  printerModel: string | null;
  printerVersion: string | null;
  printerSerialNo: string | null;
  serviceVersion: string | null;
  paperWidth: string | null;
  statusCode: number | null;
}

let sunmiPrinterPluginPromise: Promise<SunmiPrinterPlugin | null> | null = null;

async function getSunmiPrinterPlugin() {
  if (
    typeof window === "undefined" ||
    !isNativePlatform() ||
    getPlatform() !== "android" ||
    !isCapacitorPluginAvailable("SunmiPrinter")
  ) {
    return null;
  }

  sunmiPrinterPluginPromise ??= import("@capacitor/core").then(
    ({ registerPlugin }) => registerPlugin<SunmiPrinterPlugin>("SunmiPrinter"),
  );

  return sunmiPrinterPluginPromise;
}

async function getCapacitorBridge(): Promise<SunmiNativePrinterBridge | null> {
  const sunmiPrinterPlugin = await getSunmiPrinterPlugin();

  if (!sunmiPrinterPlugin) {
    return null;
  }

  return {
    async isAvailable() {
      const result = await sunmiPrinterPlugin.isAvailable();
      return result.available;
    },
    async printText(content: string) {
      await sunmiPrinterPlugin.printText({ content });
    },
    async testPrint() {
      await sunmiPrinterPlugin.testPrint();
    },
    async getDeviceInfo() {
      const result = await sunmiPrinterPlugin.getDeviceInfo();
      return {
        model: result.model,
        printerType: "sunmi-built-in" as const,
      };
    },
  };
}

async function getBridge(): Promise<SunmiNativePrinterBridge | null> {
  const nativeBridge = await getCapacitorBridge();

  if (nativeBridge) {
    return nativeBridge;
  }

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
  const bridge = await getBridge();

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
    const supported =
      (isNativePlatform() &&
        getPlatform() === "android" &&
        isCapacitorPluginAvailable("SunmiPrinter")) ||
      (typeof window !== "undefined" &&
        Boolean(
          window.__POSARD_SUNMI_PRINTER__ ??
            window.POSARDSunmiPrinter ??
            window.SunmiPrinter,
        ));

    return {
      mode: "sunmi-built-in-native",
      transport: meta.transport,
      driver: meta.driver,
      label: meta.label,
      description: meta.description,
      supported,
      reason: supported
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

  async printReceipt(segments: string[], logoImageUrl?: string | null) {
    let logoBase64Png: string | null = null;

    try {
      logoBase64Png = logoImageUrl ? await getReceiptLogoBase64Png(logoImageUrl) : null;
    } catch (error) {
      console.warn("Receipt logo could not be prepared for SUNMI printing.", error);
    }

    const sunmiPrinterPlugin = await getSunmiPrinterPlugin();

    if (sunmiPrinterPlugin) {
      const result = await sunmiPrinterPlugin.isAvailable();

      if (!result.available) {
        throw new Error(
          "The SUNMI built-in printer service is unavailable on this Android device.",
        );
      }

      await sunmiPrinterPlugin.printReceipt({
        segments: segments.filter((segment) => segment.trim().length > 0),
        logoBase64Png,
      });
      return;
    }

    const bridge = await assertAvailableBridge();
    await bridge.printText(segments.join("\n\n\n"));
  },

  async getDiagnostics(): Promise<SunmiNativePrinterDiagnostics> {
    const sunmiPrinterPlugin = await getSunmiPrinterPlugin();

    if (sunmiPrinterPlugin) {
      const availability = await sunmiPrinterPlugin.isAvailable();

      if (!availability.available) {
        return {
          available: false,
          connected: availability.connected,
          model: availability.model,
          printerType: "sunmi-built-in",
          printerModel: null,
          printerVersion: null,
          printerSerialNo: null,
          serviceVersion: null,
          paperWidth: null,
          statusCode: null,
        };
      }

      const info = await sunmiPrinterPlugin.getDeviceInfo();

      return {
        available: true,
        connected: availability.connected,
        model: info.model,
        printerType: "sunmi-built-in",
        printerModel: info.printerModel ?? null,
        printerVersion: info.printerVersion ?? null,
        printerSerialNo: info.printerSerialNo ?? null,
        serviceVersion: info.serviceVersion ?? null,
        paperWidth: info.paperWidth ?? null,
        statusCode: info.statusCode ?? null,
      };
    }

    const bridge = await getBridge();
    const available = bridge ? await bridge.isAvailable() : false;
    const deviceInfo =
      bridge && available ? await bridge.getDeviceInfo() : null;

    return {
      available,
      connected: Boolean(bridge),
      model: deviceInfo?.model ?? "Unknown device",
      printerType: "sunmi-built-in",
      printerModel: null,
      printerVersion: null,
      printerSerialNo: null,
      serviceVersion: null,
      paperWidth: null,
      statusCode: null,
    };
  },

  async testPrint() {
    const bridge = await assertAvailableBridge();
    await bridge.testPrint();
  },
};
