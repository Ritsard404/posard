export type CustomerDisplayStatus = "idle" | "cart" | "payment" | "completed";

export interface CustomerDisplayItemDTO {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerDisplayPaymentDetailsDTO {
  methodName: string | null;
  qrImageUrl: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  providerName: string | null;
  instructions: string | null;
}

export interface CustomerDisplayDTO {
  terminalId: string;
  status: CustomerDisplayStatus;
  items: CustomerDisplayItemDTO[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalDue: number;
  paymentMethod?: string | null;
  paymentDetails?: CustomerDisplayPaymentDetailsDTO | null;
  cashReceived?: number | null;
  change?: number | null;
  message?: string | null;
  updatedAt: string;
}

export interface CustomerDisplayMetaDTO {
  terminalId: string;
  terminalName: string;
  storeName: string;
  logoImageUrl: string | null;
}

const statuses: CustomerDisplayStatus[] = ["idle", "cart", "payment", "completed"];

function sanitizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeNullableString(value: unknown) {
  const text = sanitizeString(value);
  return text ? text : null;
}

function sanitizePaymentDetails(value: unknown): CustomerDisplayPaymentDetailsDTO | null {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  if (!source) return null;

  const details = {
    methodName: sanitizeNullableString(source.methodName),
    qrImageUrl: sanitizeNullableString(source.qrImageUrl),
    accountHolder: sanitizeNullableString(source.accountHolder),
    accountNumber: sanitizeNullableString(source.accountNumber),
    providerName: sanitizeNullableString(source.providerName),
    instructions: sanitizeNullableString(source.instructions),
  };

  return Object.values(details).some(Boolean) ? details : null;
}

function sanitizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 100) / 100
    : 0;
}

function sanitizeDate(value: unknown) {
  const text = sanitizeString(value);
  const date = text ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toISOString()
    : new Date().toISOString();
}

export function buildIdleCustomerDisplayDTO(
  terminalId: string,
): CustomerDisplayDTO {
  return {
    terminalId,
    status: "idle",
    items: [],
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    totalDue: 0,
    paymentMethod: null,
    paymentDetails: null,
    cashReceived: null,
    change: null,
    message: "Ready for next customer",
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeCustomerDisplayDTO(
  value: unknown,
  terminalId: string,
): CustomerDisplayDTO {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const status = statuses.includes(source.status as CustomerDisplayStatus)
    ? (source.status as CustomerDisplayStatus)
    : "idle";
  const sourceItems = Array.isArray(source.items) ? source.items : [];

  return {
    terminalId,
    status,
    items: sourceItems
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        name: sanitizeString(item.name, "Item"),
        qty: sanitizeNumber(item.qty),
        unitPrice: sanitizeNumber(item.unitPrice),
        lineTotal: sanitizeNumber(item.lineTotal),
      }))
      .filter((item) => item.qty > 0),
    subtotal: sanitizeNumber(source.subtotal),
    discountTotal: sanitizeNumber(source.discountTotal),
    taxTotal: sanitizeNumber(source.taxTotal),
    totalDue: sanitizeNumber(source.totalDue),
    paymentMethod: sanitizeNullableString(source.paymentMethod),
    paymentDetails: sanitizePaymentDetails(source.paymentDetails),
    cashReceived:
      source.cashReceived === null || source.cashReceived === undefined
        ? null
        : sanitizeNumber(source.cashReceived),
    change:
      source.change === null || source.change === undefined
        ? null
        : sanitizeNumber(source.change),
    message: sanitizeNullableString(source.message),
    updatedAt: sanitizeDate(source.updatedAt),
  };
}
