import type { Prisma } from "@prisma/client";
import type { ReceiptDto } from "../_dto/receipt.dto";
import { printConfigService } from "../print-config.service";

function getPaymentMethodName(name: string | null) {
  return name?.trim() || "Unlabeled payment method";
}

type InvoiceReceiptRecord = Prisma.InvoiceGetPayload<{
  select: {
    id: true;
    invoiceNumber: true;
    createdAt: true;
    dueAmount: true;
    totalTendered: true;
    discountType: true;
    discountAmount: true;
    eligibleDiscName: true;
    customerName: true;
    totalAmount: true;
    cashTendered: true;
    changeAmount: true;
    vatSales: true;
    vatExempt: true;
    vatZero: true;
    vatAmount: true;
    isTrainMode: true;
    posTerminal: {
      select: {
        posName: true;
        printerName: true;
        printerDisplayName: true;
        printerConnectionType: true;
        printerVendorId: true;
        printerProductId: true;
        printerDeviceId: true;
        printerServiceUuid: true;
        printerCharacteristicUuid: true;
        autoPrintEnabled: true;
        registeredName: true;
        address: true;
        vatTinNumber: true;
        minNumber: true;
        vat: true;
      };
    };
    cashier: {
      select: {
        fullName: true;
      };
    };
    ePayments: {
      select: {
        amount: true;
        reference: true;
        saleType: {
          select: {
            name: true;
          };
        };
      };
    };
    items: {
      select: {
        id: true;
        qty: true;
        subTotal: true;
        status: true;
        product: {
          select: {
            name: true;
          };
        };
      };
    };
  };
}>;

export function mapInvoiceToReceipt(invoice: InvoiceReceiptRecord): ReceiptDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt.toISOString(),
    posTerminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
    printerName: invoice.posTerminal.printerName || null,
    printerConfig: printConfigService.mapPrinterConfig(invoice.posTerminal),
    registeredName: invoice.posTerminal.registeredName,
    address: invoice.posTerminal.address,
    vatTinNumber: invoice.posTerminal.vatTinNumber,
    minNumber: invoice.posTerminal.minNumber,
    terminalVat: invoice.posTerminal.vat ?? 0,
    cashierName: invoice.cashier.fullName ?? "Unknown",
    isTrainMode: invoice.isTrainMode,
    discountType: invoice.discountType ?? null,
    discountAmount: Number(invoice.discountAmount ?? 0),
    dueAmount: Number(invoice.dueAmount ?? 0),
    totalTendered: Number(invoice.totalTendered ?? 0),
    eligibleDiscName: invoice.eligibleDiscName ?? null,
    customerName: invoice.customerName ?? null,
    totalAmount: Number(invoice.totalAmount),
    cashTendered: Number(invoice.cashTendered ?? 0),
    changeAmount: Number(invoice.changeAmount ?? 0),
    vatSales: Number(invoice.vatSales ?? 0),
    vatExempt: Number(invoice.vatExempt ?? 0),
    vatZero: Number(invoice.vatZero ?? 0),
    vatAmount: Number(invoice.vatAmount ?? 0),
    otherPayments: invoice.ePayments.map((payment) => ({
      name: getPaymentMethodName(payment.saleType.name),
      amount: Number(payment.amount),
      reference: payment.reference,
    })),
    stockUpdates: [],
    items: invoice.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      qty: Number(item.qty),
      subTotal: Number(item.subTotal),
      status: item.status,
    })),
  };
}
