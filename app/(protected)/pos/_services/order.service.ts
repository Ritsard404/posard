import "server-only";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type {
  CancelOrderDto,
  DiscountDto,
  EPaymentDto,
  ItemRequestDto,
  OrderDto,
  PaymentCalculation,
} from "./_dto/order.dto";
import { InvoiceStatusType, VatType } from "@prisma/client";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true, role: true },
  });

  if (!profile) throw new Error("Profile not found");
  return profile;
}

async function getTerminalForProfile(companyId: string) {
  const terminal = await prisma.posTerminalInfo.findFirst({
    where: { companyId },
    select: {
      id: true,
      vat: true,
      discountMax: true,
      isTrainMode: true,
      resetCounterNo: true,
      resetCounterTrainNo: true,
      isRetailType: true,
    },
  });

  if (!terminal) throw new Error("No active terminal found for user's company");
  return terminal;
}

// ─────────────────────────────────────────────
// Invoice Number Generator
// Mirrors Java: generateInvoiceNumber()
// Each terminal has its own independent sequence.
// Train mode starts at 9,000,001 to be easily identifiable.
// ─────────────────────────────────────────────

async function generateInvoiceNumber(
  terminalId: string,
  isTrainMode: boolean,
): Promise<number> {
  const last = await prisma.invoice.findFirst({
    where: { posTerminalId: terminalId, isTrainMode },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  const nextNumber = last ? last.invoiceNumber + 1 : 1;
  return isTrainMode ? 9_000_000 + nextNumber : nextNumber;
}

async function updateTerminalCounter(
  terminalId: string,
  isTrainMode: boolean,
  current: { resetCounterNo: number; resetCounterTrainNo: number },
) {
  await prisma.posTerminalInfo.update({
    where: { id: terminalId },
    data: isTrainMode
      ? { resetCounterTrainNo: current.resetCounterTrainNo + 1 }
      : { resetCounterNo: current.resetCounterNo + 1 },
  });
}

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

function validateOrderRequest(dto: OrderDto) {
  if (!dto.items || dto.items.length === 0) {
    throw new Error("Items cannot be empty");
  }

  if (dto.cashTenderAmount == null) {
    throw new Error("Cash tender amount is required");
  }

  for (const item of dto.items) {
    if (item.qty <= 0) throw new Error("Quantity must be greater than zero");
    if (item.price < 0) throw new Error("Price cannot be negative");
  }
}

function validatePayment(calc: PaymentCalculation) {
  if (calc.cashTendered < calc.totalAmount) {
    throw new Error(
      `Insufficient payment. Required: ₱${calc.totalAmount.toFixed(2)}, Tendered: ₱${calc.cashTendered.toFixed(2)}`,
    );
  }
}

// ─────────────────────────────────────────────
// Product Loading
// ─────────────────────────────────────────────

async function loadAndValidateProducts(
  items: ItemRequestDto[],
  skipStockCheck = false,
) {
  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)];

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds }, isDeleted: false },
    select: {
      id: true,
      name: true,
      vatType: true,
      quantity: true,
      trackInventory: true,
    },
  });

  if (products.length !== uniqueProductIds.length) {
    throw new Error("One or more products not found");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate stock
  if (!skipStockCheck) {
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      // Only check if product is set to track inventory
      if (product.trackInventory) {
        const available = Number(product.quantity ?? 0);
        if (available < item.qty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${available}, Required: ${item.qty}`,
          );
        }
      }
    }
  }

  return productMap;
}

async function loadProducts(items: ItemRequestDto[]) {
  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)];

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds }, isDeleted: false },
    select: {
      id: true,
      name: true,
      vatType: true,
      quantity: true,
      trackInventory: true,
    },
  });

  if (products.length !== uniqueProductIds.length) {
    throw new Error("One or more products not found");
  }

  return new Map(products.map((p) => [p.id, p]));
}

// ─────────────────────────────────────────────
// Payment Calculation
// Mirrors Java: calculatePayment()
// ─────────────────────────────────────────────

function calculateTotalByVatType(
  items: ItemRequestDto[],
  productMap: Awaited<ReturnType<typeof loadProducts>>,
  vatType: VatType,
): number {
  return items
    .filter((item) => productMap.get(item.productId)?.vatType === vatType)
    .reduce((sum, item) => sum + item.subTotal, 0);
}

function calculateDiscountAmount(
  discount: DiscountDto | undefined,
  grossTotal: number,
  maxDiscount: number,
): number {
  if (!discount) return 0;

  // Fixed amount discount takes priority
  if (discount.discountAmount && discount.discountAmount > 0) {
    return Math.min(discount.discountAmount, maxDiscount);
  }

  // Percentage discount
  if (discount.discountPercent && discount.discountPercent > 0) {
    const amount = (grossTotal * discount.discountPercent) / 100;
    return Math.min(amount, maxDiscount);
  }

  return 0;
}

function calculatePayment(
  dto: OrderDto,
  productMap: Awaited<ReturnType<typeof loadProducts>>,
  vatRate: number, // e.g. 12 → stored as 12 in DB
  maxDiscount: number, // stored as Decimal in DB
): PaymentCalculation {
  const vat = vatRate / 100; // 12 → 0.12

  const vatableTotal = calculateTotalByVatType(
    dto.items,
    productMap,
    "VATABLE",
  );
  const vatExemptTotal = calculateTotalByVatType(
    dto.items,
    productMap,
    "EXEMPT",
  );
  const vatZeroTotal = calculateTotalByVatType(dto.items, productMap, "ZERO");

  // VAT Sales = vatable / (1 + vatRate)
  const vatSales = round2(vatableTotal / (1 + vat));
  const vatAmount = round2(vatableTotal - vatSales);

  const grossTotal = dto.items.reduce((sum, i) => sum + i.subTotal, 0);
  const discountAmount = calculateDiscountAmount(
    dto.discount,
    grossTotal,
    maxDiscount,
  );

  const totalAmount = round2(grossTotal - discountAmount);
  const dueAmount = totalAmount;
  const subTotal = round2(dueAmount - vatAmount);

  const ePaymentTotal = dto.ePayments
    ? dto.ePayments.reduce((sum, p) => sum + p.amount, 0)
    : 0;

  const remainingAfterCash = totalAmount - dto.cashTenderAmount;
  const effectiveEPayment = Math.min(
    ePaymentTotal,
    Math.max(remainingAfterCash, 0),
  );

  const totalTendered = round2(dto.cashTenderAmount + effectiveEPayment);
  const changeAmount = round2(totalTendered - totalAmount);

  return {
    grossAmount: round2(grossTotal),
    totalAmount,
    subTotal,
    discountAmount: round2(discountAmount),
    vatableTotal: round2(vatableTotal),
    vatSales,
    vatAmount,
    vatExempt: round2(vatExemptTotal),
    vatZero: round2(vatZeroTotal),
    cashTendered: dto.cashTenderAmount,
    totalTendered,
    changeAmount,
    dueAmount,
  };
}

// ─────────────────────────────────────────────
// Stock Deduction
// Mirrors Java: deductStock()
// ─────────────────────────────────────────────

async function deductStock(
  items: ItemRequestDto[],
  productMap: Awaited<ReturnType<typeof loadProducts>>,
) {
  // Only deduct for items that track inventory
  const itemsToDeduct = items.filter(
    (item) => productMap.get(item.productId)?.trackInventory,
  );

  await Promise.all(
    itemsToDeduct.map((item) => {
      const product = productMap.get(item.productId)!;
      const newQty = Number(product.quantity ?? 0) - item.qty;

      return prisma.product.update({
        where: { id: item.productId },
        data: { quantity: newQty },
      });
    }),
  );
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const orderService = {
  /**
   * POST /orders/pay
   *
   * Mirrors Java: OrderService.payOrder()
   *
   * Steps:
   *  1. Validate request
   *  2. Get current cashier & their terminal
   *  3. Load products & validate stock
   *  4. Calculate payment (VAT breakdown, discount, change)
   *  5. Validate tender >= total
   *  6. Generate invoice number
   *  7. Persist invoice + items + e-payments in one transaction
   *  8. Deduct stock (skipped in train mode)
   *  9. Increment terminal counter
   */
  async payOrder(dto: OrderDto): Promise<void> {
    // 1. Validate request
    validateOrderRequest(dto);

    // 2. Get cashier & terminal
    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const terminal = await getTerminalForProfile(profile.companyId);

    // 3. Load products & validate stock
    const productMap = await loadAndValidateProducts(
      dto.items,
      !terminal.isRetailType,
    );

    // 4. Calculate payment
    const calc = calculatePayment(
      dto,
      productMap,
      terminal.vat,
      Number(terminal.discountMax),
    );

    // 5. Validate tender
    validatePayment(calc);

    // 6. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(
      terminal.id,
      terminal.isTrainMode,
    );

    // 7. Persist — invoice + items + e-payments
    await prisma.invoice.create({
      data: {
        invoiceNumber,
        posTerminalId: terminal.id,
        cashierId: profile.id,

        grossAmount: calc.grossAmount,
        totalAmount: calc.totalAmount,
        subTotal: calc.subTotal,
        cashTendered: calc.cashTendered,
        dueAmount: calc.dueAmount,
        totalTendered: calc.totalTendered,
        changeAmount: calc.changeAmount,
        vatSales: calc.vatSales,
        vatExempt: calc.vatExempt,
        vatAmount: calc.vatAmount,
        vatZero: calc.vatZero,
        discountAmount: calc.discountAmount,

        // Discount metadata
        eligibleDiscName: dto.discount?.eligibleDiscName,
        oscaIdNum: dto.discount?.oscaIdNum,
        discountType: dto.discount?.discountType,
        discountPercent: dto.discount?.discountPercent,

        status: "PAID" satisfies InvoiceStatusType,
        isTrainMode: terminal.isTrainMode,

        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            subTotal: item.status === "VOID" ? 0 : item.subTotal,
            status: item.status || ("PAID" satisfies InvoiceStatusType),
            isTrainingMode: terminal.isTrainMode,
          })),
        },

        ...(dto.ePayments?.length
          ? {
              ePayments: {
                create: await buildEPaymentData(dto.ePayments),
              },
            }
          : {}),
      },
    });

    // 8. Deduct stock (skip in train mode or non-retail)
    if (!terminal.isTrainMode && terminal.isRetailType) {
      await deductStock(dto.items, productMap);
    }

    // 9. Update terminal counter
    await updateTerminalCounter(terminal.id, terminal.isTrainMode, terminal);
  },

  /**
   * POST /orders/cancel
   *
   * Mirrors Java: OrderService.cancelOrder()
   *
   * Steps:
   *  1. Validate manager exists and has manager/admin role
   *  2. Get current cashier & terminal
   *  3. Load products (no stock validation needed for cancel)
   *  4. Calculate payment (for record keeping in the invoice)
   *  5. Generate invoice number
   *  6. Persist cancelled invoice + void items
   *  7. Increment terminal counter
   *  Note: Stock is NOT deducted for cancelled orders.
   */
  async cancelOrder(dto: CancelOrderDto): Promise<void> {
    // 1. Validate manager
    const manager = await prisma.profile.findFirst({
      where: { email: dto.managerIdentifier },
      select: { id: true, role: true },
    });

    if (!manager) throw new Error("Manager not found");

    if (manager.role !== "admin" && manager.role !== "manager") {
      throw new Error("User does not have manager privileges");
    }

    // 2. Get cashier & terminal
    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const terminal = await getTerminalForProfile(profile.companyId);

    // 3. Load products (no stock check for cancellation)
    const productMap = await loadProducts(dto.order.items);

    // 4. Calculate payment (for record keeping)
    const calc = calculatePayment(
      dto.order,
      productMap,
      terminal.vat,
      Number(terminal.discountMax),
    );

    // 5. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(
      terminal.id,
      terminal.isTrainMode,
    );

    // 6. Persist cancelled invoice with VOID items
    await prisma.invoice.create({
      data: {
        invoiceNumber,
        posTerminalId: terminal.id,
        cashierId: profile.id,
        voidedById: manager.id,
        reason: dto.reason,

        // Gross is recorded; everything else is zeroed (mirrors Java)
        grossAmount: calc.grossAmount,
        totalAmount: 0,
        subTotal: 0,
        cashTendered: 0,
        dueAmount: 0,
        totalTendered: 0,
        changeAmount: 0,
        vatSales: 0,
        vatExempt: 0,
        vatAmount: 0,
        vatZero: 0,
        discountAmount: 0,

        status: "CANCELLED" satisfies InvoiceStatusType,
        isTrainMode: terminal.isTrainMode,

        items: {
          create: dto.order.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            subTotal: 0, // Cancelled items have 0 subtotal
            status: "VOID" satisfies InvoiceStatusType,
            isTrainingMode: terminal.isTrainMode,
          })),
        },
      },
    });

    // 7. Update terminal counter
    await updateTerminalCounter(terminal.id, terminal.isTrainMode, terminal);
  },
};

// ─────────────────────────────────────────────
// E-Payment builder
// Validates each saleTypeId exists before creating
// ─────────────────────────────────────────────

async function buildEPaymentData(ePayments: EPaymentDto[]) {
  const saleTypeIds = ePayments.map((p) => p.saleTypeId);

  const saleTypes = await prisma.saleType.findMany({
    where: { id: { in: saleTypeIds } },
    select: { id: true },
  });

  if (saleTypes.length !== saleTypeIds.length) {
    throw new Error("One or more sale types not found");
  }

  return ePayments.map((p) => ({
    saleTypeId: p.saleTypeId,
    reference: p.reference,
    amount: p.amount,
  }));
}
