import type { PrinterConfigDto } from "./print.dto";

export interface ReceiptItemDto {
  id: string;
  productName: string;
  qty: number;
  subTotal: number;
  status: "CANCELLED" | "RETURNED" | "VOID" | "PENDING" | "PAID";
  selections?: {
    modifierGroupName: string;
    modifierGroupType: "VARIANT" | "MODIFIER" | "ADDON" | "INSTRUCTION";
    optionName?: string | null;
    priceDelta: number;
    quantity: number;
    sortOrder: number;
  }[];
  specialInstructions?: string | null;
}

export interface ReceiptOtherPaymentDto {
  name: string;
  amount: number;
  reference: string | null;
}

export interface ReceiptStockUpdateDto {
  productId: string;
  remainingQuantity: number;
}

export interface ReceiptDebtDetailsDto {
  debtId: string;
  customerId: string;
  customerName: string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  upfrontCashAmount: number;
  approvedByName?: string | null;
}

export interface ReceiptDto {
  id: string;
  invoiceNumber: number | null;
  localInvoiceNo?: string | null;
  isProvisional?: boolean;
  syncStatus?: "pending" | "syncing" | "synced" | "failed" | "needs_review";
  syncError?: string | null;
  createdAt: string;
  posTerminalName: string;
  printerName: string | null;
  printerConfig: PrinterConfigDto | null;
  registeredName: string | null;
  address: string | null;
  vatTinNumber: string | null;
  minNumber: string | null;
  terminalVat: number;
  cashierName: string;
  isTrainMode: boolean;
  fulfillmentType?: "WALK_IN" | "DINE_IN" | "TAKE_OUT" | "DELIVERY" | "PICKUP";
  tableNumber?: string | null;
  guestCount?: number | null;
  deliveryCustomerName?: string | null;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  deliveryFee?: number | null;
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
  debt?: ReceiptDebtDetailsDto | null;
}
