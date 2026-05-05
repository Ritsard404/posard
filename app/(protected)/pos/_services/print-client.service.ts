import type {
  PrinterCapabilityDto,
  PrintJobDto,
  PrinterConfigDto,
  PrintJobResultDto,
} from "./_dto/print.dto";
import { bluetoothPrinterConnectionService } from "./bluetooth-printer-connection.service";
import { printDeviceService } from "./print-device.service";
import { printPreviewService } from "./print-preview.service";
import { getPrinterModeLabel } from "./printer-mode.service";
import { sunmiNativePrintService } from "./sunmi-native-print.service";

export const printClientService = {
  getStatus(config: PrinterConfigDto | null) {
    const support = printDeviceService.getBrowserSupport();
    const hasConfig = Boolean(config?.mode && config?.transport && config?.driver);
    const bluetoothStatus =
      config?.driver === "webbluetooth"
        ? bluetoothPrinterConnectionService.getConnectionStatus()
        : null;

    if (!hasConfig) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "No paired printer saved for this terminal.",
        support,
      };
    }

    if (config?.driver === "webusb" && !support.usb) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "This browser does not support WebUSB.",
        support,
      };
    }

    if (config?.driver === "webbluetooth" && !support.bluetooth) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "This browser does not support Web Bluetooth.",
        support,
      };
    }

    if (config?.driver === "webserial" && !support.serial) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description:
          "This browser does not support Web Serial. On Android, Bluetooth Serial requires a newer Chromium build.",
        support,
      };
    }

    if (config?.driver === "sunmi-native" && !support.sunmiNative) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description:
          "This saved built-in printer is not available in this runtime. You can still preview the receipt or pair another printer.",
        support,
      };
    }

    if (
      config?.driver === "webbluetooth" &&
      (!config.serviceUuid || !config.characteristicUuid)
    ) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "Bluetooth printer is paired, but thermal write characteristics are not configured.",
        support,
      };
    }

    if (config && !config.autoPrintEnabled) {
      return {
        tone: "fallback" as const,
        label: "Auto print off",
        description: "Printer is configured, but automatic printing is disabled.",
        support,
      };
    }

    if (bluetoothStatus && bluetoothStatus.state === "connected") {
      return {
        tone: "ready" as const,
        label: "Printer connected",
        description: bluetoothStatus.message ?? "Bluetooth printer is ready.",
        support,
      };
    }

    if (
      bluetoothStatus &&
      ["connecting", "reconnecting", "requesting"].includes(bluetoothStatus.state)
    ) {
      return {
        tone: "fallback" as const,
        label:
          bluetoothStatus.state === "reconnecting"
            ? "Reconnecting"
            : "Connecting",
        description: bluetoothStatus.message ?? "Bluetooth printer connection is being restored.",
        support,
      };
    }

    if (
      bluetoothStatus &&
      ["disconnected", "error"].includes(bluetoothStatus.state)
    ) {
      return {
        tone: "fallback" as const,
        label: "Printer disconnected",
        description:
          bluetoothStatus.message ??
          "Bluetooth printer is saved but not connected. Reconnect before printing.",
        support,
      };
    }

    return {
      tone: "ready" as const,
      label: "Printer configured",
      description: `Configured for ${getPrinterModeLabel(config?.mode)}.`,
      support,
    };
  },

  getCapabilities(): PrinterCapabilityDto[] {
    return printDeviceService.getCapabilities();
  },

  async pair(mode: PrinterCapabilityDto["mode"]) {
    return printDeviceService.pair(mode);
  },

  subscribeToBluetoothStatus(listener: Parameters<typeof bluetoothPrinterConnectionService.subscribe>[0]) {
    return bluetoothPrinterConnectionService.subscribe(listener);
  },

  getBluetoothConnectionStatus() {
    return bluetoothPrinterConnectionService.getConnectionStatus();
  },

  async reconnectKnownPrinter(config: PrinterConfigDto | null) {
    if (config?.driver !== "webbluetooth") {
      return false;
    }

    return bluetoothPrinterConnectionService.reconnectKnownPrinter(config);
  },

  disconnectPrinter(config: PrinterConfigDto | null) {
    if (config?.driver === "webbluetooth") {
      bluetoothPrinterConnectionService.disconnectPrinter();
    }
  },

  async getNativeDiagnostics(config: PrinterConfigDto | null) {
    if (config?.driver !== "sunmi-native") {
      return null;
    }

    return sunmiNativePrintService.getDiagnostics();
  },

  async print(
    job: PrintJobDto,
    options?: {
      fallbackToPreview?: boolean;
    },
  ): Promise<PrintJobResultDto> {
    const fallbackToPreview = options?.fallbackToPreview ?? true;

    if (!job.printerConfig || !printDeviceService.isLikelyConfigured(job.printerConfig)) {
      if (fallbackToPreview) {
        printPreviewService.open(job, false);
      }

      return {
        status: fallbackToPreview ? "previewed" : "unsupported",
        message: fallbackToPreview
          ? "No paired printer was available. Opened preview instead."
          : "No paired printer was available for this terminal.",
      };
    }

    let result: PrintJobResultDto;

    try {
      result = await printDeviceService.print(job, job.printerConfig);
    } catch (error) {
      if (fallbackToPreview) {
        printPreviewService.open(job, false);
      }

      return {
        status: fallbackToPreview ? "previewed" : "failed",
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : fallbackToPreview
              ? "Printing failed. Opened preview instead."
              : "Printing failed.",
      };
    }

    if (result.status === "printed") {
      return result;
    }

    if (fallbackToPreview) {
      printPreviewService.open(job, false);
      return {
        status: "previewed",
        message: result.message,
      };
    }

    return {
      status: result.status,
      message: result.message,
    };
  },

  openPreview(job: PrintJobDto, autoPrint = false) {
    printPreviewService.open(job, autoPrint);
  },
};
