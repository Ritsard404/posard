import { InvoiceStatusType } from "@prisma/client";
import type { ReceiptDto } from "./_dto/receipt.dto";
import type {
  XReadingDto,
  ZReadingDto,
} from "@/app/(protected)/report/_services/_dto/report.dto";

const RECEIPT_WIDTH = 32;
const QTY_WIDTH = 5;
const DESC_WIDTH = 18;
const AMOUNT_WIDTH = 9;

function separator(char = "-") {
  return char.repeat(RECEIPT_WIDTH);
}

function centerText(text: string) {
  const clean = text.trim();

  if (clean.length >= RECEIPT_WIDTH) {
    return clean;
  }

  return clean
    .padStart(Math.floor((RECEIPT_WIDTH + clean.length) / 2))
    .padEnd(RECEIPT_WIDTH);
}

function alignText(left: string, right: string) {
  const safeLeft = left.trimEnd();
  const safeRight = right.trim();
  return safeLeft.padEnd(RECEIPT_WIDTH - safeRight.length) + safeRight;
}

function alignLabelAmount(label: string, amount: string) {
  if (label.length + amount.length + 1 <= RECEIPT_WIDTH) {
    return label.padEnd(RECEIPT_WIDTH - amount.length) + amount;
  }

  return `${label}\n${amount.padStart(RECEIPT_WIDTH)}`;
}

function formatItemLine(qty: string, description: string, amount: string) {
  return `${qty.padEnd(QTY_WIDTH)}${description.padEnd(DESC_WIDTH)}${amount.padStart(AMOUNT_WIDTH)}`;
}

function formatInvoiceDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatShortDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(value)
    .replace(",", "");
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

function valueOrNA(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "N/A";
}

function formatPeso(value: number) {
  return value.toFixed(2);
}

function formatPaymentLabel(name: string, count: number) {
  return count > 0
    ? `${name.toUpperCase()} (${count}):`
    : `${name.toUpperCase()}:`;
}

function extractTrailingNumber(value: string) {
  const match = value.trim().match(/(\d+)\D*$/);
  return match ? Number(match[1]) : null;
}

function getDocumentRangeCount(beginning: string, ending: string) {
  const start = extractTrailingNumber(beginning);
  const end = extractTrailingNumber(ending);

  if (start === null || end === null || end < start) {
    return 0;
  }

  return end - start + 1;
}

function isAcknowledgementReceipt(receipt: ReceiptDto) {
  return receipt.terminalVat <= 0;
}

export function formatInvoiceNumber(value: number) {
  return String(value).padStart(12, "0");
}

function buildInvoiceContent(receipt: ReceiptDto, copyLabel?: string) {
  const content: string[] = [];
  const acknowledgement = isAcknowledgementReceipt(receipt);

  if (copyLabel) {
    content.push(centerText(`*** ${copyLabel} ***`));
  }

  if (receipt.isTrainMode) {
    content.push(centerText("TRAIN MODE"), "");
  }

  if (acknowledgement) {
    content.push(
      separator("="),
      centerText("Acknowledgment Receipt"),
      separator("="),
    );
  } else {
    content.push(
      separator("="),
      centerText("INVOICE"),
      separator("="),
      centerText(receipt.registeredName ?? "N/A"),
      centerText(receipt.address ?? "N/A"),
    );

    if (receipt.vatTinNumber?.trim()) {
      content.push(centerText(`TIN: ${receipt.vatTinNumber.trim()}`));
    }

    if (receipt.minNumber?.trim()) {
      content.push(centerText(`MIN: ${receipt.minNumber.trim()}`));
    }

    content.push(separator());
  }

  content.push(
    "",
    `INV: ${formatInvoiceNumber(receipt.invoiceNumber)}`.padEnd(RECEIPT_WIDTH),
    "",
    `Date: ${formatInvoiceDate(receipt.createdAt)}`.padEnd(RECEIPT_WIDTH),
    `Cashier: ${receipt.cashierName}`.padEnd(RECEIPT_WIDTH),
    separator(),
    formatItemLine("Qty", "Description", "Amount"),
    separator(),
    "",
  );

  for (const item of receipt.items.filter((item) => item.status !== InvoiceStatusType.VOID)) {
    content.push(
      formatItemLine(
        String(item.qty),
        item.productName.length > DESC_WIDTH
          ? item.productName.slice(0, DESC_WIDTH)
          : item.productName,
        formatAmount(item.subTotal),
      ),
    );
  }

  content.push(
    separator(),
    centerText(
      `${"Total:".padEnd(15)}${formatAmount(receipt.totalAmount).padStart(17)}`,
    ),
  );

  if (receipt.eligibleDiscName || receipt.otherPayments.length > 0) {
    content.push(
      alignLabelAmount(
        `Discount(${receipt.discountType ?? "N/A"}):`,
        formatAmount(receipt.discountAmount),
      ),
    );
  }

  content.push(
    centerText(
      `${"Due Amount:".padEnd(15)}${formatAmount(receipt.dueAmount).padStart(17)}`,
    ),
  );

  for (const payment of receipt.otherPayments) {
    content.push(
      centerText(
        `${`${payment.name}:`.padEnd(15)}${formatAmount(payment.amount).padStart(17)}`,
      ),
    );
    if (payment.reference) {
      content.push(centerText(`Ref: ${payment.reference}`));
    }
  }

  content.push(
    centerText(
      `${"Cash:".padEnd(15)}${formatAmount(receipt.cashTendered).padStart(17)}`,
    ),
    centerText(
      `${"Total Tender:".padEnd(15)}${formatAmount(receipt.totalTendered).padStart(17)}`,
    ),
    centerText(
      `${"Change:".padEnd(15)}${formatAmount(receipt.changeAmount).padStart(17)}`,
    ),
    "",
  );

  if (!acknowledgement) {
    content.push(
      centerText(
        `${"Vat Zero:".padEnd(15)}${formatAmount(receipt.vatZero).padStart(17)}`,
      ),
      centerText(
        `${"Vat Exempt:".padEnd(15)}${formatAmount(receipt.vatExempt).padStart(17)}`,
      ),
      centerText(
        `${"Vat Sales:".padEnd(15)}${formatAmount(receipt.vatSales).padStart(17)}`,
      ),
      centerText(
        `${"Vat Amount:".padEnd(15)}${formatAmount(receipt.vatAmount).padStart(17)}`,
      ),
      "",
    );
  }

  if (receipt.eligibleDiscName) {
    content.push(
      `Name: ${receipt.eligibleDiscName}`,
      "Address:______________",
      "TIN: _________________",
      "Signature: ___________",
      "",
    );
  } else {
    content.push(
      "Name:_________________",
      "Address:______________",
      "TIN: _________________",
      "Signature: ___________",
      "",
    );
  }

  return content.join("\n");
}

export function buildInvoicePrintPackage(receipt: ReceiptDto) {
  const archiveContent = buildInvoiceContent(receipt);
  const requiresCopy =
    Boolean(receipt.eligibleDiscName) || receipt.otherPayments.length > 0;
  const printSegments = requiresCopy
    ? [archiveContent, buildInvoiceContent(receipt, "COPY")]
    : [archiveContent];

  return {
    archiveContent,
    printSegments,
    previewContent: printSegments.join(`\n\n${separator("=")}\n\n`),
  };
}

export function buildXReadingPrintContent(reading: XReadingDto) {
  const generatedAt = reading.generatedAt;
  const paymentLines = [
    alignText("CASH", formatPeso(reading.cashSales)),
    ...reading.otherPayments.map((payment) =>
      alignText(
        formatPaymentLabel(payment.name, payment.count),
        formatPeso(payment.amount),
      ),
    ),
    alignText("Total Payments:", formatPeso(reading.paymentsReceived)),
  ];
  const summaryLines = [
    alignText("Cash In Drawer:", formatPeso(reading.actualCash)),
    ...reading.otherPayments.map((payment) =>
      alignText(
        formatPaymentLabel(payment.name, payment.count),
        formatPeso(payment.amount),
      ),
    ),
    alignText("Opening Fund:", formatPeso(reading.openingFund)),
    alignText("Less Withdrawal:", formatPeso(reading.withdrawalAmount)),
    alignText("Payments Received:", formatPeso(reading.paymentsReceived)),
  ];

  const content: string[] = [];

  if (reading.isTrainMode) {
    content.push(centerText("TRAIN MODE"), "");
  }

  if (!reading.isAcknowledgement) {
    content.push(
      centerText(valueOrNA(reading.businessName)),
      centerText(`Operated by: ${valueOrNA(reading.operatorName)}`),
      "",
      centerText(valueOrNA(reading.addressLine)),
      "",
      centerText(`VAT REG TIN: ${valueOrNA(reading.vatRegTin)}`),
      centerText(`MIN: ${valueOrNA(reading.minNumber)}`),
      centerText(`S/N: ${valueOrNA(reading.serialNumber)}`),
      "",
    );
  }

  content.push(
    centerText("X-READING REPORT"),
    "",
    alignText("Report Date:", formatLongDate(generatedAt)),
    alignText("Report Time:", formatTime(generatedAt)),
    "",
    alignText("Start Date/Time:", formatShortDateTime(reading.range.from)),
    alignText("End Date/Time:", formatShortDateTime(reading.range.to)),
    "",
    alignText(`Cashier: ${reading.cashierName}`, ""),
    "",
    alignText("Beg. OR #:", reading.beginningOrNumber),
    alignText("End. OR #:", reading.endingOrNumber),
    alignText("Txn Count #:", String(reading.invoiceCount)),
    "",
    alignText("Opening Fund:", formatPeso(reading.openingFund)),
    separator("="),
    centerText("PAYMENTS RECEIVED"),
    "",
    ...paymentLines,
    separator("="),
    alignText(`VOID (${reading.voidCount})`, formatPeso(reading.voidAmount)),
    separator("="),
    alignText(
      `REFUND (${reading.refundCount})`,
      formatPeso(reading.refundAmount),
    ),
    separator("="),
    alignText("WITHDRAWAL", formatPeso(reading.withdrawalAmount)),
    separator("="),
    centerText("TRANSACTION SUMMARY"),
    "",
    ...summaryLines,
    separator("="),
    alignText("SHORT/OVER:", formatPeso(reading.shortOver)),
    "",
  );

  return content.join("\n");
}

export function buildZReadingPrintContent(reading: ZReadingDto) {
  const generatedAt = reading.generatedAt;
  const voidCount = getDocumentRangeCount(reading.beginningVoid, reading.endingVoid);
  const transactionSummaryLines = [
    alignText("Cash In Drawer:", formatPeso(reading.drawerCash)),
    ...reading.paymentBreakdown.map((payment) =>
      alignText(
        formatPaymentLabel(payment.name, payment.count),
        formatPeso(payment.amount),
      ),
    ),
    alignText("Opening Fund:", formatPeso(reading.openingFund)),
    alignText("Less Withdrawal:", formatPeso(reading.withdrawalAmount)),
    alignText("Payments Received:", formatPeso(reading.paymentsReceived)),
  ];

  const content: string[] = [];

  if (reading.isTrainMode) {
    content.push(centerText("TRAIN MODE"), "");
  }

  if (!reading.isAcknowledgement) {
    content.push(
      centerText(valueOrNA(reading.businessName)),
      centerText(`Operated by: ${valueOrNA(reading.operatorName)}`),
      centerText(valueOrNA(reading.addressLine)),
      centerText(`VAT REG TIN: ${valueOrNA(reading.vatRegTin)}`),
      centerText(`MIN: ${valueOrNA(reading.minNumber)}`),
      centerText(`S/N: ${valueOrNA(reading.serialNumber)}`),
      "",
    );
  }

  content.push(
    centerText("Z-READING REPORT"),
    "",
    alignText("Report Date:", formatLongDate(generatedAt)),
    alignText("Report Time:", formatTime(generatedAt)),
    "",
    alignText("Start Date/Time:", formatShortDateTime(reading.range.from)),
    alignText("End Date/Time:", formatShortDateTime(reading.range.to)),
    "",
    alignText("Beg. SI #:", reading.beginningSI),
    alignText("End. SI #:", reading.endingSI),
    alignText("Beg. VOID #:", reading.beginningVoid),
    alignText("End. VOID #:", reading.endingVoid),
    alignText("Beg. RETURN #:", reading.beginningReturn),
    alignText("End. RETURN #:", reading.endingReturn),
    "",
    alignText("Txn Count #:", String(reading.invoiceCount)),
    alignText("Reset Counter No.:", String(reading.resetCounter)),
    alignText("Z Counter No.:", String(reading.zCounter)),
    separator(),
    alignText("Accum. Sales:", formatPeso(reading.presentAccumulatedSales)),
    alignText(
      "Prev. Accum. Sales:",
      formatPeso(reading.previousAccumulatedSales),
    ),
    alignText("Sales for the Day:", formatPeso(reading.salesForTheDay)),
    separator(),
    centerText("BREAKDOWN OF SALES"),
    "",
    alignText("VATABLE SALES:", formatPeso(reading.vatableSales)),
    alignText("VAT AMOUNT:", formatPeso(reading.vatAmount)),
    alignText("VAT EXEMPT SALES:", formatPeso(reading.vatExemptSales)),
    alignText("ZERO RATED SALES:", formatPeso(reading.vatZeroSales)),
    separator(),
    alignText("Gross Amount:", formatPeso(reading.grossSales)),
    alignText("Less Discount:", formatPeso(reading.totalDiscounts)),
    alignText("Less Return:", formatPeso(reading.totalReturns)),
    alignText("Less Void:", formatPeso(reading.totalVoids)),
    alignText("Less VAT Adjustment:", formatPeso(reading.lessVatAdjustment)),
    alignText("Net Amount:", formatPeso(reading.netSales)),
    separator(),
    centerText("DISCOUNT SUMMARY"),
    alignText(
      `SC Disc. (${reading.seniorCount}):`,
      formatPeso(reading.seniorDiscount),
    ),
    alignText(
      `PWD Disc. (${reading.pwdCount}):`,
      formatPeso(reading.pwdDiscount),
    ),
    alignText(
      `Other Disc. (${reading.otherCount}):`,
      formatPeso(reading.otherDiscount),
    ),
    separator(),
    centerText("SALES ADJUSTMENT"),
    alignText(`VOID (${voidCount}):`, formatPeso(reading.totalVoids)),
    alignText(
      `RETURN (${reading.returnCount}):`,
      formatPeso(reading.totalReturns),
    ),
    separator(),
    centerText("VAT ADJUSTMENT"),
    alignText("SC TRANS. :", formatPeso(reading.seniorDiscount)),
    alignText("PWD TRANS :", formatPeso(reading.pwdDiscount)),
    alignText("REG.Disc. TRANS :", formatPeso(reading.otherDiscount)),
  );

  if (!reading.isAcknowledgement) {
    content.push(
      alignText("ZERO-RATED TRANS.:", formatPeso(reading.vatZeroSales)),
      alignText("VAT on Return:", formatPeso(reading.vatOnReturn)),
      alignText(
        "Other VAT Adjustments:",
        formatPeso(reading.otherVatAdjustments),
      ),
      separator(),
    );
  }

  content.push(
    centerText("TRANSACTION SUMMARY"),
    "",
    ...transactionSummaryLines,
    separator(),
    alignText("SHORT/OVER:", formatPeso(reading.shortOver)),
    "",
  );

  return content.join("\n");
}

export function buildReprintContent(content: string, reprintCount: number) {
  return [
    content.trimEnd(),
    "",
    separator("="),
    `Reprint #${reprintCount}`,
    `Date ${new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(new Date())
      .replace(",", "")}`,
    separator("="),
  ].join("\n");
}
