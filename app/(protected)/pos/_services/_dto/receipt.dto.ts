export interface ReceiptItemDto {
  id: string;
  productName: string;
  qty: number;
  subTotal: number;
  status: "CANCELLED" | "RETURNED" | "VOID" | "PENDING" | "PAID";
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
  isTrainMode: boolean;
  totalAmount: number;
  cashTendered: number;
  changeAmount: number;
  vatSales: number;
  vatExempt: number;
  vatZero: number;
  vatAmount: number;
  items: ReceiptItemDto[];
  stockUpdates: ReceiptStockUpdateDto[];
}
