import "server-only";
import { assertTerminalBillingAllowsPos } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Prisma } from "@prisma/client";
import { InvoiceDocumentType, InvoiceStatusType } from "@prisma/client";
import type {
  CancelOrderDto,
  DiscountDto,
  EPaymentDto,
  ItemRequestDto,
  OrderDto,
  InvoiceStatusType as OrderInvoiceStatusType,
} from "./_dto/order.dto";
import type { ReceiptDto } from "./_dto/receipt.dto";
import {
  calculatePayment,
  getEffectiveDiscountPercent,
  isDiscountWithRequiredMetadata,
  type PaymentCalculationItem,
} from "./payment-calculation.service";
import { mapInvoiceToReceipt } from "./_mappers/receipt.mapper";
import { receiptPrintService } from "./receipt-print.service";
import { printArchiveService } from "./print-archive.service";
import { printConfigService } from "./print-config.service";

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

async function getActiveTimestampForOrder(companyId: string, timestampId: string) {
  if (!timestampId) {
    throw new Error("Active POS session is required");
  }

  const timestamp = await prisma.timestamp.findFirst({
    where: {
      id: timestampId,
      timestampOut: null,
      posTerminal: { companyId },
    },
    select: {
      id: true,
      cashierId: true,
      deviceId: true,
      forceClosedAt: true,
      cashier: {
        select: {
          fullName: true,
        },
      },
      posTerminal: {
        select: {
          id: true,
          posName: true,
          vat: true,
          discountCapType: true,
          discountMax: true,
          isTrainMode: true,
          resetCounterNo: true,
          resetCounterTrainNo: true,
          printerName: true,
          printerDisplayName: true,
          printerConnectionType: true,
          printerTransport: true,
          printerDriver: true,
          printerVendorId: true,
          printerProductId: true,
          printerDeviceId: true,
          printerServiceUuid: true,
          printerCharacteristicUuid: true,
          autoPrintEnabled: true,
          registeredName: true,
          address: true,
          vatTinNumber: true,
          minNumber: true,
        },
      },
    },
  });

  if (!timestamp) {
    throw new Error("Active POS session not found for this terminal");
  }

  await assertTerminalBillingAllowsPos(companyId, timestamp.posTerminal.id);

  return timestamp;
}

async function findInvoiceByIdempotencyKey(
  db: Prisma.TransactionClient | typeof prisma,
  idempotencyKey: string,
) {
  return db.invoice.findFirst({
    where: { idempotencyKey },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      dueAmount: true,
      totalTendered: true,
      discountType: true,
      discountAmount: true,
      eligibleDiscName: true,
      customerName: true,
      totalAmount: true,
      cashTendered: true,
      changeAmount: true,
      vatSales: true,
      vatExempt: true,
      vatZero: true,
      vatAmount: true,
      isTrainMode: true,
      localInvoiceNo: true,
      posTerminal: {
        select: {
          posName: true,
          printerName: true,
          printerDisplayName: true,
          printerConnectionType: true,
          printerTransport: true,
          printerDriver: true,
          printerVendorId: true,
          printerProductId: true,
          printerDeviceId: true,
          printerServiceUuid: true,
          printerCharacteristicUuid: true,
          autoPrintEnabled: true,
          registeredName: true,
          address: true,
          vatTinNumber: true,
          minNumber: true,
          vat: true,
        },
      },
      cashier: {
        select: {
          fullName: true,
        },
      },
      ePayments: {
        select: {
          amount: true,
          reference: true,
          saleType: {
            select: {
              name: true,
            },
          },
        },
      },
      items: {
        select: {
          id: true,
          qty: true,
          subTotal: true,
          status: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

async function generateInvoiceNumber(
  db: Prisma.TransactionClient | typeof prisma,
  terminalId: string,
  isTrainMode: boolean,
): Promise<number> {
  const last = await db.invoice.findFirst({
    where: { posTerminalId: terminalId, isTrainMode },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  const nextNumber = last ? last.invoiceNumber + 1 : 1;
  return isTrainMode ? 9_000_000 + nextNumber : nextNumber;
}

async function updateTerminalCounter(
  db: Prisma.TransactionClient | typeof prisma,
  terminalId: string,
  isTrainMode: boolean,
  current: { resetCounterNo: number; resetCounterTrainNo: number },
) {
  await db.posTerminalInfo.update({
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

  if (!dto.timestampId) {
    throw new Error("Active POS session is required");
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
  if (calc.totalTendered < calc.totalAmount) {
    throw new Error(
      `Insufficient payment. Required: PHP ${calc.totalAmount.toFixed(2)}, Tendered: PHP ${calc.totalTendered.toFixed(2)}`,
    );
  }
}

async function loadAndValidateProducts(
  db: Prisma.TransactionClient | typeof prisma,
  items: ItemRequestDto[],
  skipStockCheck = false,
) {
  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)];

  const products = await db.product.findMany({
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

type ProductLookup = Awaited<ReturnType<typeof loadAndValidateProducts>>;

function buildReceiptFromOrder(input: {
  invoice: {
    id: string;
    invoiceNumber: number;
    createdAt: Date;
    isTrainMode: boolean;
    localInvoiceNo?: string | null;
  };
  terminal: Awaited<ReturnType<typeof getActiveTimestampForOrder>>["posTerminal"];
  cashierName: string | null;
  calc: ReturnType<typeof calculatePayment>;
  discount?: DiscountDto;
  items: ItemRequestDto[];
  productMap: ProductLookup;
  otherPayments: ReceiptDto["otherPayments"];
  stockUpdates: ReceiptDto["stockUpdates"];
}): ReceiptDto {
  return {
    id: input.invoice.id,
    invoiceNumber: input.invoice.invoiceNumber,
    localInvoiceNo: input.invoice.localInvoiceNo ?? null,
    isProvisional: false,
    syncStatus: "synced",
    syncError: null,
    createdAt: input.invoice.createdAt.toISOString(),
    posTerminalName: input.terminal.posName ?? "Unnamed terminal",
    printerName: input.terminal.printerName || null,
    printerConfig: printConfigService.mapPrinterConfig(input.terminal),
    registeredName: input.terminal.registeredName,
    address: input.terminal.address,
    vatTinNumber: input.terminal.vatTinNumber,
    minNumber: input.terminal.minNumber,
    terminalVat: input.terminal.vat ?? 0,
    cashierName: input.cashierName ?? "Unknown",
    isTrainMode: input.invoice.isTrainMode,
    discountType: input.discount?.discountType ?? null,
    discountAmount: input.calc.discountAmount,
    dueAmount: input.calc.dueAmount,
    totalTendered: input.calc.totalTendered,
    eligibleDiscName: input.discount?.eligibleDiscName ?? null,
    customerName: input.discount?.eligibleDiscName ?? null,
    totalAmount: input.calc.totalAmount,
    cashTendered: input.calc.cashTendered,
    changeAmount: input.calc.changeAmount,
    vatSales: input.calc.vatSales,
    vatExempt: input.calc.vatExempt,
    vatZero: input.calc.vatZero,
    vatAmount: input.calc.vatAmount,
    otherPayments: input.otherPayments,
    stockUpdates: input.stockUpdates,
    items: input.items.map((item) => ({
      id: item.productId,
      productName: input.productMap.get(item.productId)?.name ?? "Unknown",
      qty: item.qty,
      subTotal: item.status === "VOID" ? 0 : item.subTotal,
      status: item.status ?? ("PAID" satisfies OrderInvoiceStatusType),
    })),
  };
}

async function loadProducts(items: ItemRequestDto[]) {
  return loadProductsWithDb(prisma, items);
}

async function loadProductsWithDb(
  db: Prisma.TransactionClient | typeof prisma,
  items: ItemRequestDto[],
) {
  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)];

  const products = await db.product.findMany({
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
  db: Prisma.TransactionClient,
  items: ItemRequestDto[],
  productMap: Awaited<ReturnType<typeof loadProductsWithDb>>,
) {
  const itemsToDeduct = items.filter(
    (item) => productMap.get(item.productId)?.trackInventory,
  );

  const stockUpdates = await Promise.all(
    itemsToDeduct.map(async (item) => {
      const product = productMap.get(item.productId)!;
      const newQty = Number(product.quantity ?? 0) - item.qty;

      await db.product.update({
        where: { id: item.productId },
        data: { quantity: newQty },
      });

      return {
        productId: item.productId,
        remainingQuantity: Math.max(0, newQty),
      };
    }),
  );

  return stockUpdates;
}

export const orderService = {
  async payOrder(dto: OrderDto): Promise<ReceiptDto> {
    validateOrderRequest(dto);
    const discount = normalizeDiscount(dto.discount);

    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const activeTimestamp = await getActiveTimestampForOrder(
      profile.companyId,
      dto.timestampId,
    );
    const terminal = activeTimestamp.posTerminal;

    if (activeTimestamp.forceClosedAt) {
      throw new Error("This terminal session was force-closed and needs review before syncing.");
    }

    if (dto.deviceId && activeTimestamp.deviceId && dto.deviceId !== activeTimestamp.deviceId) {
      throw new Error("This queued action belongs to a different device.");
    }

    const ePaymentData = dto.ePayments?.length
      ? await buildEPaymentData(dto.ePayments)
      : undefined;

    const receipt = await prisma.$transaction(async (tx) => {
      if (dto.idempotencyKey) {
        const existingInvoice = await findInvoiceByIdempotencyKey(
          tx,
          dto.idempotencyKey,
        );

        if (existingInvoice) {
          return mapInvoiceToReceipt(existingInvoice);
        }
      }

      const transactionProductMap = await loadAndValidateProducts(
        tx,
        dto.items,
        false,
      );

      const calc = calculatePayment({
        items: buildCalculationItems(dto.items, transactionProductMap),
        discount,
        vatRate: terminal.vat ?? 0,
        discountCapType: terminal.discountCapType,
        discountCapValue: terminal.discountMax ? Number(terminal.discountMax) : null,
        cashTenderAmount: dto.cashTenderAmount,
        ePayments: dto.ePayments,
      });

      validatePayment(calc);

      const invoiceNumber = await generateInvoiceNumber(
        tx,
        terminal.id,
        terminal.isTrainMode,
      );

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          idempotencyKey: dto.idempotencyKey ?? null,
          sourceDeviceId: dto.deviceId ?? activeTimestamp.deviceId ?? null,
          sourceTimestampId: activeTimestamp.id,
          localInvoiceNo: dto.localInvoiceNo ?? null,
          posTerminalId: terminal.id,
          cashierId: activeTimestamp.cashierId,

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
          discountPercent: getEffectiveDiscountPercent(
            discount,
            terminal.discountCapType === "percent"
              ? (terminal.discountMax ? Number(terminal.discountMax) : 0)
              : undefined,
          ),

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

          ...(ePaymentData?.length
            ? {
                ePayments: {
                  create: ePaymentData.map((payment) => ({
                    saleTypeId: payment.saleTypeId,
                    reference: payment.reference,
                    amount: payment.amount,
                  })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          invoiceNumber: true,
          createdAt: true,
          isTrainMode: true,
          localInvoiceNo: true,
        },
      });

      const stockUpdates =
        !terminal.isTrainMode
          ? await deductStock(tx, dto.items, transactionProductMap)
          : [];

      await updateTerminalCounter(tx, terminal.id, terminal.isTrainMode, terminal);

      return buildReceiptFromOrder({
        invoice,
        terminal,
        cashierName: activeTimestamp.cashier.fullName,
        calc,
        discount,
        items: dto.items,
        productMap: transactionProductMap,
        otherPayments: ePaymentData?.map((payment) => ({
          name: payment.name,
          amount: payment.amount,
          reference: payment.reference,
        })) ?? [],
        stockUpdates,
      });
    });

    return receipt;
  },

  async archiveReceipt(receipt: ReceiptDto): Promise<void> {
    const printPayload = receiptPrintService.buildPayload(receipt);

    await printArchiveService.createArchive({
      type: InvoiceDocumentType.INVOICE,
      content: printPayload.archiveContent,
      invoiceId: receipt.id,
      isTrainMode: receipt.isTrainMode,
    });
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
    const activeTimestamp = await getActiveTimestampForOrder(
      profile.companyId,
      dto.order.timestampId,
    );
    const terminal = activeTimestamp.posTerminal;

    const productMap = await loadProducts(dto.order.items);
    const discount = normalizeDiscount(dto.order.discount);
    const calc = calculatePayment({
      items: buildCalculationItems(dto.order.items, productMap),
      discount,
      vatRate: terminal.vat ?? 0,
      discountCapType: terminal.discountCapType,
      discountCapValue: terminal.discountMax ? Number(terminal.discountMax) : null,
      cashTenderAmount: dto.order.cashTenderAmount,
      ePayments: dto.order.ePayments,
    });

    const invoiceNumber = await generateInvoiceNumber(
      prisma,
      terminal.id,
      terminal.isTrainMode,
    );

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        posTerminalId: terminal.id,
        cashierId: activeTimestamp.cashierId,
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

        status: "VOID" satisfies InvoiceStatusType,
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

    await updateTerminalCounter(
      prisma,
      terminal.id,
      terminal.isTrainMode,
      terminal,
    );
  },
};

async function buildEPaymentData(ePayments: EPaymentDto[]) {
  const saleTypeIds = ePayments.map((p) => p.saleTypeId);
  const uniqueSaleTypeIds = [...new Set(saleTypeIds)];

  const saleTypes = await prisma.saleType.findMany({
    where: { id: { in: uniqueSaleTypeIds }, type: "EPAYMENT" },
    select: { id: true, name: true },
  });

  if (saleTypes.length !== uniqueSaleTypeIds.length) {
    throw new Error("One or more reference payment methods are invalid");
  }

  const saleTypeNameMap = new Map(
    saleTypes.map((saleType) => [
      saleType.id,
      saleType.name?.trim() || "Unlabeled payment method",
    ]),
  );

  return ePayments.map((payment) => {
    const reference = payment.reference.trim();
    const name = saleTypeNameMap.get(payment.saleTypeId);

    if (!name) {
      throw new Error("Reference payment method is invalid");
    }

    if (!reference) {
      throw new Error("Reference number is required");
    }

    if (payment.amount <= 0) {
      throw new Error("Reference payment amount must be greater than zero");
    }

    return {
      saleTypeId: payment.saleTypeId,
      reference,
      amount: payment.amount,
      name,
    };
  });
}
