// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type DiscountType = "PWD" | "SENIOR" | "DSWD" | "OTHERS";
export type InvoiceStatusType = "CANCELLED" | "RETURNED" | "VOID" | "PENDING" | "PAID";
export type VatType = "VATABLE" | "EXEMPT" | "ZERO";
export type SettlementMode = "pay_now" | "debt";
export type FulfillmentType = "WALK_IN" | "DINE_IN" | "TAKE_OUT" | "DELIVERY" | "PICKUP";
export type ModifierGroupType = "VARIANT" | "MODIFIER" | "ADDON" | "INSTRUCTION";

export interface OrderItemSelectionDto {
  modifierGroupName: string;
  modifierGroupType: ModifierGroupType;
  optionName?: string;
  priceDelta: number;
  quantity: number;
  sortOrder: number;
}

// ─────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────

export interface ItemRequestDto {
  productId: string;
  qty: number;
  price: number;
  subTotal: number;
  status?: InvoiceStatusType;
  basePrice?: number;
  specialInstructions?: string;
  selections?: OrderItemSelectionDto[];
  prescriptionRequired?: boolean;
  prescriptionConfirmed?: boolean;
  prescriptionReference?: string;
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
  managerPin?: string;
}

export interface OrderDto {
  timestampId: string;
  deviceId?: string;
  idempotencyKey?: string;
  invoiceNumber?: number;
  localInvoiceNo?: string;
  items: ItemRequestDto[];
  cashTenderAmount: number;
  ePayments?: EPaymentDto[];
  discount?: DiscountDto;
  fulfillmentType?: FulfillmentType;
  tableNumber?: string;
  guestCount?: number;
  deliveryCustomerName?: string;
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryFee?: number;
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

export interface ReturnInvoiceItemDto {
  invoiceItemId: string;
  quantity: number;
}

export interface ReturnInvoiceDto {
  invoiceId: string;
  items: ReturnInvoiceItemDto[];
  reason: string;
  notes?: string;
  managerPin?: string;
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
