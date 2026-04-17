import type { CashTrackReportDto } from "./_dto/pos.dto";
import type { PrinterConfigDto } from "./_dto/print.dto";

const LINE_WIDTH = 32;

function divider() {
  return "-".repeat(LINE_WIDTH);
}

function center(text: string) {
  const clean = text.trim();

  if (clean.length >= LINE_WIDTH) {
    return clean;
  }

  const leftPadding = Math.floor((LINE_WIDTH - clean.length) / 2);
  return `${" ".repeat(leftPadding)}${clean}`;
}

function money(value: number) {
  return value.toFixed(2);
}

function buildLine(label: string, amount: string) {
  const available = LINE_WIDTH - label.length - amount.length - 1;

  if (available < 1) {
    return `${label}\n${amount.padStart(LINE_WIDTH)}`;
  }

  return `${label}${" ".repeat(available)} ${amount}`;
}

function buildBody(
  report: CashTrackReportDto,
  mode: "cash-in" | "cash-out",
) {
  const title =
    mode === "cash-in" ? "CASH IN SLIP" : report.timestampOut ? "CASH OUT SLIP" : "CASH WITHDRAWAL SLIP";

  const lines = [
    center("POSARD"),
    center(title),
    divider(),
    `Terminal: ${report.terminalName}`,
    `Cashier: ${report.cashierName}`,
    `Session: ${report.timestampId}`,
    divider(),
    buildLine("Opening Cash", money(report.openingCash)),
    buildLine("Cash Sales", money(report.totalCashSales)),
    buildLine("E-Payments", money(report.totalEPaymentSales)),
    buildLine("Withdrawals", money(report.totalWithdrawals)),
    buildLine("Drawer Total", money(report.expectedDrawerAmount)),
    divider(),
  ];

  if (mode === "cash-in") {
    lines.push(buildLine("Cash In", money(report.openingCash)));
  } else {
    lines.push(buildLine("Cash Out", money(report.timestampOut ? report.expectedDrawerAmount : report.totalWithdrawals)));
  }

  lines.push(divider(), center("END OF SLIP"));
  return lines.join("\n");
}

export interface CashTrackPrintPayloadDto {
  title: string;
  printerAvailable: boolean;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  message: string;
  previewContent: string;
}

export const cashTrackPrintService = {
  buildPayload(
    report: CashTrackReportDto,
    mode: "cash-in" | "cash-out",
  ): CashTrackPrintPayloadDto {
    const printerConfig = report.printerConfig;
    const printerName = printerConfig?.displayName ?? null;

    return {
      title: mode === "cash-in" ? "Cash In" : "Cash Out",
      printerAvailable: Boolean(
        printerConfig?.connectionType && printerConfig.autoPrintEnabled,
      ),
      printerName,
      printerConfig,
      message: printerName
        ? `Printer configured (${printerName}). Printing will be attempted on this device first.`
        : "No paired printer found. Showing printable preview instead.",
      previewContent: buildBody(report, mode),
    };
  },
};
