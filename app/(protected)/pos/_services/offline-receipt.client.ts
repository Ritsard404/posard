"use client";

import type { OrderDto } from "./_dto/order.dto";
import type { ReceiptDto } from "./_dto/receipt.dto";
import type { ProductDto } from "./_dto/pos.dto";
import type { PrinterConfigDto } from "./_dto/print.dto";
import { calculatePayment } from "./payment-calculation.service";
import { formatInvoiceNumber } from "./print-format.service";

export function buildProvisionalInvoiceNumber(input: {
  terminalLabel: string;
  createdAt: Date;
  counter: number;
}) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(input.createdAt);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const date = `${value("year")}${value("month")}${value("day")}`;
  const time = `${value("hour")}${value("minute")}${value("second")}`;
  const terminal = input.terminalLabel
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  const suffix = String(input.counter).padStart(4, "0");
  return `SI-${date}-${time}-${terminal || "TERM"}-${suffix}`;
}

export function buildProvisionalReceipt(input: {
  order: OrderDto;
  products: ProductDto[];
  cashierName: string | null;
  terminalName: string;
  terminalVat: number;
  printerConfig: PrinterConfigDto | null;
  counter: number;
  invoiceNumber?: number;
}) {
  const productMap = new Map(input.products.map((product) => [product.id, product]));
  const createdAt = new Date();
  const localInvoiceNo = input.invoiceNumber
    ? formatInvoiceNumber(input.invoiceNumber)
    : buildProvisionalInvoiceNumber({
        terminalLabel: input.terminalName,
        createdAt,
        counter: input.counter,
      });

  const calc = calculatePayment({
    items: input.order.items.map((item) => ({
      productId: item.productId,
      subTotal: item.subTotal,
      vatType: productMap.get(item.productId)?.vatType ?? "VATABLE",
    })),
    discount: input.order.discount,
    vatRate: input.terminalVat,
    discountCapType: null,
    discountCapValue: null,
    cashTenderAmount: input.order.cashTenderAmount,
    ePayments: input.order.ePayments,
  });

  const otherPayments = (input.order.ePayments ?? []).map((payment) => ({
    name: "Reference payment",
    amount: payment.amount,
    reference: payment.reference,
  }));

  const stockUpdates = input.order.items
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product?.trackInventory) {
        return null;
      }

      return {
        productId: item.productId,
        remainingQuantity: Number(product.quantity ?? 0) - item.qty,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const receipt: ReceiptDto = {
    id: `local-${crypto.randomUUID()}`,
    invoiceNumber: input.invoiceNumber ?? null,
    localInvoiceNo,
    isProvisional: !input.invoiceNumber,
    syncStatus: "pending",
    syncError: null,
    createdAt: createdAt.toISOString(),
    posTerminalName: input.terminalName,
    printerName: input.printerConfig?.displayName ?? null,
    printerConfig: input.printerConfig,
    registeredName: null,
    address: null,
    vatTinNumber: null,
    minNumber: null,
    terminalVat: input.terminalVat,
    cashierName: input.cashierName ?? "Unknown",
    isTrainMode: false,
    discountType: input.order.discount?.discountType ?? null,
    discountAmount: calc.discountAmount,
    dueAmount: calc.dueAmount,
    totalTendered: calc.totalTendered,
    eligibleDiscName: input.order.discount?.eligibleDiscName ?? null,
    customerName: input.order.discount?.eligibleDiscName ?? null,
    totalAmount: calc.totalAmount,
    cashTendered: calc.cashTendered,
    changeAmount: calc.changeAmount,
    vatSales: calc.vatSales,
    vatExempt: calc.vatExempt,
    vatZero: calc.vatZero,
    vatAmount: calc.vatAmount,
    otherPayments,
    items: input.order.items.map((item) => ({
      id: item.productId,
      productName: productMap.get(item.productId)?.name ?? "Unknown",
      qty: item.qty,
      subTotal: item.subTotal,
      status: item.status ?? "PAID",
    })),
    stockUpdates,
    debt: null,
  };

  return { receipt, localInvoiceNo, stockUpdates };
}
