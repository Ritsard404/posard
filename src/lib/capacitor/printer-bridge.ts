import type {
  PrinterConfigDto,
  PrintJobDto,
  PrintJobResultDto,
} from "@/app/(protected)/pos/_services/_dto/print.dto";
import { printClientService } from "@/app/(protected)/pos/_services/print-client.service";
import type { ReceiptPrintPayloadDto } from "@/app/(protected)/pos/_services/receipt-print.service";
import { sunmiNativePrintService } from "@/app/(protected)/pos/_services/sunmi-native-print.service";
import { getPlatform, isCapacitorRuntime } from "./platform";

export interface PrintResult extends PrintJobResultDto {
  runtime: "capacitor-native" | "web-printer" | "web-preview";
}

interface PrintReceiptOptions {
  fallbackToPreview?: boolean;
  printerConfig?: PrinterConfigDto | null;
}

function buildReceiptJob(
  payload: ReceiptPrintPayloadDto,
  printerConfig: PrinterConfigDto | null,
): PrintJobDto {
  return {
    title: "Receipt",
    intent: "receipt",
    previewContent: payload.previewContent,
    printSegments: payload.printSegments,
    printerConfig,
  };
}

function toRuntime(result: PrintJobResultDto): PrintResult["runtime"] {
  return result.status === "printed" ? "web-printer" : "web-preview";
}

export function canUseNativeReceiptBridge(printerConfig: PrinterConfigDto | null) {
  return Boolean(
    printerConfig?.driver === "sunmi-native" &&
      printerConfig.mode === "sunmi-built-in-native" &&
      isCapacitorRuntime() &&
      getPlatform() === "android",
  );
}

async function tryNativeReceiptPrint(
  job: PrintJobDto,
  fallbackToPreview: boolean,
): Promise<PrintResult | null> {
  if (!canUseNativeReceiptBridge(job.printerConfig)) {
    return null;
  }

  try {
    await sunmiNativePrintService.printReceipt(
      job.printSegments?.length ? job.printSegments : [job.previewContent],
    );

    return {
      status: "printed",
      message: `Printed to ${job.printerConfig?.displayName ?? "Built-in Sunmi printer"}.`,
      runtime: "capacitor-native",
    };
  } catch (error) {
    if (fallbackToPreview) {
      printClientService.openPreview(job, false);

      return {
        status: "previewed",
        message:
          error instanceof Error && error.message.trim()
            ? `${error.message} Opened preview instead.`
            : "Native printer bridge is unavailable. Opened preview instead.",
        runtime: "web-preview",
      };
    }

    return {
      status: "failed",
      message:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Native printer bridge is unavailable.",
      runtime: "capacitor-native",
    };
  }
}

export async function printReceipt(
  payload: ReceiptPrintPayloadDto,
  options?: PrintReceiptOptions,
): Promise<PrintResult> {
  const printerConfig = options?.printerConfig ?? payload.printerConfig;
  const fallbackToPreview = options?.fallbackToPreview ?? true;
  const job = buildReceiptJob(payload, printerConfig);
  const nativeResult = await tryNativeReceiptPrint(job, fallbackToPreview);

  if (nativeResult) {
    return nativeResult;
  }

  const result = await printClientService.print(job, { fallbackToPreview });

  return {
    ...result,
    runtime: toRuntime(result),
  };
}

export function getReceiptPrintEnvironment(printerConfig: PrinterConfigDto | null) {
  return {
    isCapacitor: isCapacitorRuntime(),
    platform: getPlatform(),
    prefersNativeBridge: canUseNativeReceiptBridge(printerConfig),
  };
}
