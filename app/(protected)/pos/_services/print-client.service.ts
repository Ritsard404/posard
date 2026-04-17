import type {
  PrintJobDto,
  PrinterConfigDto,
  PrintJobResultDto,
} from "./_dto/print.dto";
import { printDeviceService } from "./print-device.service";
import { printPreviewService } from "./print-preview.service";

export const printClientService = {
  getStatus(config: PrinterConfigDto | null) {
    const support = printDeviceService.getBrowserSupport();
    const hasConfig = Boolean(config?.connectionType);

    if (!hasConfig) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "No paired printer saved for this terminal.",
        support,
      };
    }

    if (config?.connectionType === "usb" && !support.usb) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "This browser does not support WebUSB.",
        support,
      };
    }

    if (config?.connectionType === "bluetooth" && !support.bluetooth) {
      return {
        tone: "fallback" as const,
        label: "Preview fallback",
        description: "This browser does not support Web Bluetooth.",
        support,
      };
    }

    if (
      config?.connectionType === "bluetooth" &&
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

      return {
        tone: "ready" as const,
        label: "Printer configured",
        description: `Configured for ${config?.connectionType ?? "saved"} printing.`,
        support,
      };
  },

  async pair(connectionType: "usb" | "bluetooth") {
    return printDeviceService.pair(connectionType);
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
