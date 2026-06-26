import type {
  DiscountDto,
  EPaymentDto,
  ItemRequestDto,
  PaymentCalculation,
} from "./_dto/order.dto";
import type { VatType } from "./_dto/pos.dto";

export interface PaymentCalculationItem
  extends Pick<ItemRequestDto, "productId" | "subTotal"> {
  vatType: VatType;
}

export interface PaymentCalculationInput {
  items: PaymentCalculationItem[];
  discount?: DiscountDto;
  vatRate: number;
  discountCapType?: "amount" | "percent" | null;
  discountCapValue?: number | null;
  cashTenderAmount?: number;
  ePayments?: Pick<EPaymentDto, "amount">[];
}

export function isDiscountWithRequiredMetadata(
  discountType?: DiscountDto["discountType"],
): discountType is "PWD" | "SENIOR" | "DSWD" {
  return (
    discountType === "PWD" ||
    discountType === "SENIOR" ||
    discountType === "DSWD"
  );
}

export function getEffectiveDiscountPercent(
  discount?: DiscountDto,
  maxDiscountPercent?: number,
): number | undefined {
  if (!discount?.discountType) return discount?.discountPercent;
  if (isDiscountWithRequiredMetadata(discount.discountType)) return 20;
  if (!discount.discountPercent || discount.discountPercent <= 0) return undefined;

  return maxDiscountPercent === undefined
    ? discount.discountPercent
    : Math.min(discount.discountPercent, maxDiscountPercent);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateTotalByVatType(
  items: PaymentCalculationItem[],
  vatType: VatType,
): number {
  return items
    .filter((item) => item.vatType === vatType)
    .reduce((sum, item) => sum + item.subTotal, 0);
}

function calculateDiscountAmount(
  discount: DiscountDto | undefined,
  grossTotal: number,
  vatableTotal: number,
  vatExemptTotal: number,
  vatZeroTotal: number,
  vatRate: number,
  discountCapType?: "amount" | "percent" | null,
  discountCapValue?: number | null,
): number {
  if (!discount) return 0;

  if (discount.discountType && isDiscountWithRequiredMetadata(discount.discountType)) {
    const vatMultiplier = 1 + vatRate / 100;
    const convertedVatExemptAmount = vatableTotal / vatMultiplier;
    const nonVatableAmount = vatExemptTotal + vatZeroTotal;

    return round2(
      (convertedVatExemptAmount + nonVatableAmount) * 0.2 +
        (vatableTotal - convertedVatExemptAmount),
    );
  }

  const maxDiscountAmount =
    discountCapValue == null
      ? Number.MAX_SAFE_INTEGER
      : discountCapType === "percent"
        ? round2((grossTotal * discountCapValue) / 100)
        : round2(discountCapValue);

  if (discount.discountAmount && discount.discountAmount > 0) {
    return round2(Math.min(discount.discountAmount, maxDiscountAmount));
  }

  const effectiveDiscountPercent = getEffectiveDiscountPercent(
    discount,
    discountCapType === "percent" ? discountCapValue ?? undefined : undefined,
  );

  if (effectiveDiscountPercent && effectiveDiscountPercent > 0) {
    return round2(
      Math.min(
        (grossTotal * effectiveDiscountPercent) / 100,
        maxDiscountAmount,
      ),
    );
  }

  return 0;
}

export function calculatePayment(
  input: PaymentCalculationInput,
): PaymentCalculation {
  const vatableTotal = calculateTotalByVatType(input.items, "VATABLE");
  const vatExemptTotal = calculateTotalByVatType(input.items, "EXEMPT");
  const vatZeroTotal = calculateTotalByVatType(input.items, "ZERO");
  const grossTotal = input.items.reduce((sum, item) => sum + item.subTotal, 0);
  const hasStatutoryDiscount = isDiscountWithRequiredMetadata(
    input.discount?.discountType,
  );
  const vatDivisor = 1 + input.vatRate / 100;
  const statutoryVatExemptAmount = round2(vatableTotal / vatDivisor);
  const vatSales = hasStatutoryDiscount ? 0 : statutoryVatExemptAmount;
  const vatAmount = hasStatutoryDiscount
    ? 0
    : round2(vatableTotal - statutoryVatExemptAmount);
  const discountAmount = calculateDiscountAmount(
    input.discount,
    grossTotal,
    vatableTotal,
    vatExemptTotal,
    vatZeroTotal,
    input.vatRate,
    input.discountCapType,
    input.discountCapValue,
  );
  const totalAmount = round2(Math.max(grossTotal - discountAmount, 0));
  const dueAmount = totalAmount;
  const subTotal = round2(dueAmount - vatAmount);
  const ePaymentTotal = input.ePayments
    ? input.ePayments.reduce((sum, payment) => sum + payment.amount, 0)
    : 0;
  const cashTenderAmount = round2(input.cashTenderAmount ?? 0);
  const remainingAfterCash = Math.max(totalAmount - cashTenderAmount, 0);
  const effectiveEPayment = Math.min(
    ePaymentTotal,
    Math.max(remainingAfterCash, 0),
  );
  const totalTendered = round2(cashTenderAmount + effectiveEPayment);
  const changeAmount = round2(Math.max(totalTendered - totalAmount, 0));

  return {
    grossAmount: round2(grossTotal),
    totalAmount,
    subTotal,
    discountAmount,
    vatableTotal: round2(hasStatutoryDiscount ? 0 : vatableTotal),
    vatSales,
    vatAmount,
    vatExempt: round2(
      hasStatutoryDiscount
        ? vatExemptTotal + statutoryVatExemptAmount
        : vatExemptTotal,
    ),
    vatZero: round2(vatZeroTotal),
    cashTendered: cashTenderAmount,
    totalTendered,
    changeAmount,
    dueAmount,
  };
}
