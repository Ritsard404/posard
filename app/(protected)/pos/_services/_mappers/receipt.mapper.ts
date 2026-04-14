import type { Prisma } from "@prisma/client";
import type { ReceiptDto } from "../_dto/receipt.dto";

type InvoiceReceiptRecord = Prisma.InvoiceGetPayload<{
  select: {
    id: true;
    invoiceNumber: true;
    createdAt: true;
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
    posTerminalName: invoice.posTerminal.posName,
    isTrainMode: invoice.isTrainMode,
    totalAmount: Number(invoice.totalAmount),
    cashTendered: Number(invoice.cashTendered ?? 0),
    changeAmount: Number(invoice.changeAmount ?? 0),
    vatSales: Number(invoice.vatSales ?? 0),
    vatExempt: Number(invoice.vatExempt ?? 0),
    vatZero: Number(invoice.vatZero ?? 0),
    vatAmount: Number(invoice.vatAmount ?? 0),
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
