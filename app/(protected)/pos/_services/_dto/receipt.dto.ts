import type { PrinterConfigDto } from "./print.dto";

export interface ReceiptItemDto {
  id: string;
  productName: string;
  qty: number;
  subTotal: number;
  status: "CANCELLED" | "RETURNED" | "VOID" | "PENDING" | "PAID";
}

export interface ReceiptOtherPaymentDto {
  name: string;
  amount: number;
}

export interface ReceiptStockUpdateDto {
  productId: string;
  remainingQuantity: number;
}

export interface ReceiptDto {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  posTerminalName: string;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  registeredName: string;
  address: string;
  vatTinNumber: string;
  minNumber: string;
  terminalVat: number;
  cashierName: string;
  isTrainMode: boolean;
  discountType: string | null;
  discountAmount: number;
  dueAmount: number;
  totalTendered: number;
  eligibleDiscName: string | null;
  customerName: string | null;
  totalAmount: number;
  cashTendered: number;
  changeAmount: number;
  vatSales: number;
  vatExempt: number;
  vatZero: number;
  vatAmount: number;
  otherPayments: ReceiptOtherPaymentDto[];
  items: ReceiptItemDto[];
  stockUpdates: ReceiptStockUpdateDto[];
}
