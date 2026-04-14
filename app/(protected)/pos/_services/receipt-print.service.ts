import type { ReceiptDto } from "./_dto/receipt.dto";

const RECEIPT_WIDTH = 32;
const QTY_WIDTH = 5;
const DESC_WIDTH = 18;
const AMOUNT_WIDTH = 9;

function centerText(text: string) {
  if (text.length >= RECEIPT_WIDTH) {
    return text;
  }

  const leftPadding = Math.floor((RECEIPT_WIDTH + text.length) / 2);
  return text.padStart(leftPadding).padEnd(RECEIPT_WIDTH);
}

function alignLabelAmount(label: string, amount: string) {
  if (label.length + amount.length + 1 <= RECEIPT_WIDTH) {
    return label.padRight(RECEIPT_WIDTH - amount.length) + amount;
  }

  return `${label}\n${amount.padStart(RECEIPT_WIDTH)}`;
}

function formatItemLine(qty: string, description: string, amount: string) {
  return `${qty.padRight(QTY_WIDTH)}${description.padRight(DESC_WIDTH)}${amount.padStart(AMOUNT_WIDTH)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function isAcknowledgementReceipt(receipt: ReceiptDto) {
  return receipt.terminalVat <= 0;
}

function buildReceiptBody(receipt: ReceiptDto, copyLabel?: string) {
  const content: string[] = [];

  if (copyLabel) {
    content.push(centerText(`*** ${copyLabel} ***`));
  }

  if (receipt.isTrainMode) {
    content.push(centerText("TRAIN MODE"), "");
  }

  if (isAcknowledgementReceipt(receipt)) {
    content.push(
      "=".repeat(RECEIPT_WIDTH),
      centerText("Acknowledgment Receipt"),
      "=".repeat(RECEIPT_WIDTH),
    );
  } else {
    content.push(
      "=".repeat(RECEIPT_WIDTH),
      centerText("INVOICE"),
      "=".repeat(RECEIPT_WIDTH),
      centerText(receipt.registeredName),
      centerText(receipt.address),
      centerText(`TIN: ${receipt.vatTinNumber}`),
      centerText(`MIN: ${receipt.minNumber}`),
      "-".repeat(RECEIPT_WIDTH),
    );
  }

  content.push(
    "",
    `INV: ${receipt.invoiceNumber}`.padRight(RECEIPT_WIDTH),
    "",
    `Date: ${formatDate(receipt.createdAt)}`.padRight(RECEIPT_WIDTH),
    `Cashier: ${receipt.cashierName}`.padRight(RECEIPT_WIDTH),
    "-".repeat(RECEIPT_WIDTH),
    formatItemLine("Qty", "Description", "Amount"),
    "-".repeat(RECEIPT_WIDTH),
    "",
  );

  for (const item of receipt.items.filter((entry) => entry.status !== "VOID")) {
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
    "-".repeat(RECEIPT_WIDTH),
    centerText(`${"Total:".padEnd(15)}${formatAmount(receipt.totalAmount).padStart(17)}`),
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
    centerText(`${"Due Amount:".padEnd(15)}${formatAmount(receipt.dueAmount).padStart(17)}`),
  );

  if (receipt.otherPayments.length > 0) {
    for (const payment of receipt.otherPayments) {
      content.push(
        centerText(`${`${payment.name}:`.padEnd(15)}${formatAmount(payment.amount).padStart(17)}`),
      );
    }
  }

  content.push(
    centerText(`${"Cash:".padEnd(15)}${formatAmount(receipt.cashTendered).padStart(17)}`),
    centerText(`${"Total Tender:".padEnd(15)}${formatAmount(receipt.totalTendered).padStart(17)}`),
    centerText(`${"Change:".padEnd(15)}${formatAmount(receipt.changeAmount).padStart(17)}`),
    "",
  );

  if (!isAcknowledgementReceipt(receipt)) {
    content.push(
      centerText(`${"Vat Zero:".padEnd(15)}${formatAmount(receipt.vatZero).padStart(17)}`),
      centerText(`${"Vat Exempt:".padEnd(15)}${formatAmount(receipt.vatExempt).padStart(17)}`),
      centerText(`${"Vat Sales:".padEnd(15)}${formatAmount(receipt.vatSales).padStart(17)}`),
      centerText(`${"Vat Amount:".padEnd(15)}${formatAmount(receipt.vatAmount).padStart(17)}`),
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

function shouldPrintDuplicate(receipt: ReceiptDto) {
  return Boolean(receipt.eligibleDiscName) || receipt.otherPayments.length > 0;
}

export interface ReceiptPrintPayloadDto {
  printerAvailable: boolean;
  printerName: string | null;
  message: string;
  previewContent: string;
}

export const receiptPrintService = {
  buildPayload(receipt: ReceiptDto): ReceiptPrintPayloadDto {
    const printerName = receipt.printerName?.trim() || null;
    const copies = shouldPrintDuplicate(receipt)
      ? [buildReceiptBody(receipt), buildReceiptBody(receipt, "COPY")]
      : [buildReceiptBody(receipt)];

    return {
      printerAvailable: Boolean(printerName),
      printerName,
      message: printerName
        ? `Printer found (${printerName}). Choose how you want to continue.`
        : "No paired printer found. Showing printable preview instead.",
      previewContent: copies.join(`\n\n${"=".repeat(RECEIPT_WIDTH)}\n\n`),
    };
  },
};
