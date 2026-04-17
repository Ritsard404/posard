import type { ReceiptDto } from "./_dto/receipt.dto";
import type { PrinterConfigDto } from "./_dto/print.dto";
import { buildInvoicePrintPackage } from "./print-format.service";

export interface ReceiptPrintPayloadDto {
  printerAvailable: boolean;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  message: string;
  previewContent: string;
  printSegments: string[];
  archiveContent: string;
}

export const receiptPrintService = {
  buildPayload(receipt: ReceiptDto): ReceiptPrintPayloadDto {
    const printerConfig = receipt.printerConfig;
    const printerName =
      printerConfig?.displayName?.trim() || receipt.printerName?.trim() || null;
    const packageData = buildInvoicePrintPackage(receipt);
    const canAutoPrint = Boolean(
      printerConfig &&
        printerConfig.autoPrintEnabled &&
        printerConfig.connectionType,
    );

    return {
      printerAvailable: canAutoPrint,
      printerName,
      printerConfig,
      message: printerName
        ? `Printer configured (${printerName}). Printing will be attempted on this device first.`
        : "No paired printer found. Showing printable preview instead.",
      previewContent: packageData.previewContent,
      printSegments: packageData.printSegments,
      archiveContent: packageData.archiveContent,
    };
  },
};
