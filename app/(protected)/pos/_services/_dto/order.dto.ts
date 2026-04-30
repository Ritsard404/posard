// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type DiscountType = "PWD" | "SENIOR" | "OTHERS";
export type InvoiceStatusType = "CANCELLED" | "RETURNED" | "VOID" | "PENDING" | "PAID";
export type VatType = "VATABLE" | "EXEMPT" | "ZERO";
export type SettlementMode = "pay_now" | "debt";

// ─────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────

export interface ItemRequestDto {
  productId: string;
  qty: number;
  price: number;
  subTotal: number;
  status?: InvoiceStatusType;
}

export interface EPaymentDto {
  saleTypeId: string;
  reference: string;
  amount: number;
}

export interface DiscountDto {
  discountType?: DiscountType;
  eligibleDiscName?: string;
  oscaIdNum?: string;
  discountAmount?: number;
  discountPercent?: number;
}

export interface OrderDto {
  timestampId: string;
  deviceId?: string;
  idempotencyKey?: string;
  localInvoiceNo?: string;
  items: ItemRequestDto[];
  cashTenderAmount: number;
  ePayments?: EPaymentDto[];
  discount?: DiscountDto;
  settlementMode?: SettlementMode;
  debt?: {
    customerId: string;
    dueDate: string;
    notes?: string;
    upfrontCashAmount?: number;
    managerPin?: string;
  };
}

export interface CancelOrderDto {
  order: OrderDto;
  managerIdentifier: string; // email of the manager
  reason: string;
}

// ─────────────────────────────────────────────
// Internal calculation type (not exposed to caller)
// ─────────────────────────────────────────────

export interface PaymentCalculation {
  grossAmount: number;
  totalAmount: number;
  subTotal: number;
  discountAmount: number;
  vatableTotal: number;
  vatSales: number;
  vatAmount: number;
  vatExempt: number;
  vatZero: number;
  cashTendered: number;
  totalTendered: number;
  changeAmount: number;
  dueAmount: number;
}
