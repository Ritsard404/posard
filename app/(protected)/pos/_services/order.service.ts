import "server-only";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type {
  CancelOrderDto,
  DiscountDto,
  EPaymentDto,
  ItemRequestDto,
  OrderDto,
} from "./_dto/order.dto";
import { InvoiceStatusType } from "@prisma/client";
import {
  calculatePayment,
  getEffectiveDiscountPercent,
  isDiscountWithRequiredMetadata,
  type PaymentCalculationItem,
} from "./payment-calculation.service";

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

  if (isDiscountWithRequiredMetadata(dto.discount?.discountType)) {
    if (!dto.discount?.eligibleDiscName?.trim()) {
      throw new Error("Discount customer name is required");
    }

    if (!dto.discount?.oscaIdNum?.trim()) {
      throw new Error("Discount ID number is required");
    }
  }
}

function validatePayment(calc: ReturnType<typeof calculatePayment>) {
  if (calc.cashTendered < calc.totalAmount) {
    throw new Error(
      `Insufficient payment. Required: ₱${calc.totalAmount.toFixed(2)}, Tendered: ₱${calc.cashTendered.toFixed(2)}`,
    );
  }
}

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

  if (!skipStockCheck) {
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

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

function normalizeDiscount(discount?: DiscountDto): DiscountDto | undefined {
  if (!discount) return undefined;

  return {
    ...discount,
    eligibleDiscName: discount.eligibleDiscName?.trim() || undefined,
    oscaIdNum: discount.oscaIdNum?.trim() || undefined,
  };
}

function buildCalculationItems(
  items: ItemRequestDto[],
  productMap: Awaited<ReturnType<typeof loadProducts>>,
): PaymentCalculationItem[] {
  return items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    return {
      productId: item.productId,
      subTotal: item.subTotal,
      vatType: product.vatType,
    };
  });
}

async function deductStock(
  items: ItemRequestDto[],
  productMap: Awaited<ReturnType<typeof loadProducts>>,
) {
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

export const orderService = {
  async payOrder(dto: OrderDto): Promise<void> {
    validateOrderRequest(dto);
    const discount = normalizeDiscount(dto.discount);

    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const terminal = await getTerminalForProfile(profile.companyId);

    const productMap = await loadAndValidateProducts(
      dto.items,
      !terminal.isRetailType,
    );

    const calc = calculatePayment({
      items: buildCalculationItems(dto.items, productMap),
      discount,
      vatRate: terminal.vat,
      maxDiscount: Number(terminal.discountMax),
      cashTenderAmount: dto.cashTenderAmount,
      ePayments: dto.ePayments,
    });

    validatePayment(calc);

    const invoiceNumber = await generateInvoiceNumber(
      terminal.id,
      terminal.isTrainMode,
    );

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

        ...(discount?.eligibleDiscName
          ? { customerName: discount.eligibleDiscName }
          : {}),

        eligibleDiscName: discount?.eligibleDiscName,
        oscaIdNum: discount?.oscaIdNum,
        discountType: discount?.discountType,
        discountPercent: getEffectiveDiscountPercent(discount),

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

    if (!terminal.isTrainMode && terminal.isRetailType) {
      await deductStock(dto.items, productMap);
    }

    await updateTerminalCounter(terminal.id, terminal.isTrainMode, terminal);
  },

  async cancelOrder(dto: CancelOrderDto): Promise<void> {
    const manager = await prisma.profile.findFirst({
      where: { email: dto.managerIdentifier },
      select: { id: true, role: true },
    });

    if (!manager) throw new Error("Manager not found");

    if (manager.role !== "admin" && manager.role !== "manager") {
      throw new Error("User does not have manager privileges");
    }

    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const terminal = await getTerminalForProfile(profile.companyId);

    const productMap = await loadProducts(dto.order.items);
    const discount = normalizeDiscount(dto.order.discount);
    const calc = calculatePayment({
      items: buildCalculationItems(dto.order.items, productMap),
      discount,
      vatRate: terminal.vat,
      maxDiscount: Number(terminal.discountMax),
      cashTenderAmount: dto.order.cashTenderAmount,
      ePayments: dto.order.ePayments,
    });

    const invoiceNumber = await generateInvoiceNumber(
      terminal.id,
      terminal.isTrainMode,
    );

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        posTerminalId: terminal.id,
        cashierId: profile.id,
        voidedById: manager.id,
        reason: dto.reason,

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
            subTotal: 0,
            status: "VOID" satisfies InvoiceStatusType,
            isTrainingMode: terminal.isTrainMode,
          })),
        },
      },
    });

    await updateTerminalCounter(terminal.id, terminal.isTrainMode, terminal);
  },
};

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
