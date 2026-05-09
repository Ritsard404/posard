import "server-only";
import { assertTerminalBillingAllowsTransactions } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/lib/services/audit-log.service";
import { createClient } from "@/lib/supabase/server";
import { Prisma } from "@prisma/client";
import { DebtStatus, InvoiceStatusType } from "@prisma/client";
import type {
  CancelOrderDto,
  DiscountDto,
  EPaymentDto,
  ItemRequestDto,
  OrderDto,
  ReturnInvoiceDto,
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
    select: { id: true, companyId: true, role: true, fullName: true },
  });

  if (!profile) throw new Error("Profile not found");
  return profile;
}

function toIsoDateString(value: Date) {
  return value.toISOString();
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function getActiveTimestampForOrder(
  companyId: string,
  timestampId: string,
) {
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
          allowCashierDebtCreate: true,
          allowCashierDebtCollect: true,
          requireManagerApprovalForDebt: true,
          defaultDebtDueDays: true,
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

  await assertTerminalBillingAllowsTransactions(
    companyId,
    timestamp.posTerminal.id,
  );

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
      fulfillmentType: true,
      tableNumber: true,
      guestCount: true,
      deliveryCustomerName: true,
      deliveryAddress: true,
      deliveryReference: true,
      deliveryFee: true,
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
          specialInstructions: true,
          selections: {
            orderBy: { sortOrder: "asc" },
            select: {
              modifierGroupName: true,
              modifierGroupType: true,
              optionName: true,
              priceDelta: true,
              quantity: true,
              sortOrder: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      customerDebt: {
        select: {
          id: true,
          customerId: true,
          status: true,
          dueDate: true,
          originalAmount: true,
          paidAmount: true,
          remainingAmount: true,
          notes: true,
          approvedBy: {
            select: {
              fullName: true,
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

async function reserveNextTerminalInvoiceNumber(
  db: Prisma.TransactionClient | typeof prisma,
  terminalId: string,
  isTrainMode: boolean,
) {
  const terminal = await db.posTerminalInfo.findUnique({
    where: { id: terminalId },
    select: {
      resetCounterNo: true,
      resetCounterTrainNo: true,
    },
  });

  if (!terminal) {
    throw new Error("Terminal not found for invoice numbering.");
  }

  const maxInvoice = await db.invoice.aggregate({
    where: {
      posTerminalId: terminalId,
      isTrainMode,
    },
    _max: { invoiceNumber: true },
  });

  const trainOffset = 9_000_000;
  const maxInvoiceCounter = isTrainMode
    ? Math.max(0, (maxInvoice._max.invoiceNumber ?? trainOffset) - trainOffset)
    : (maxInvoice._max.invoiceNumber ?? 0);
  const currentCounter = isTrainMode
    ? terminal.resetCounterTrainNo
    : terminal.resetCounterNo;
  const nextCounter = Math.max(currentCounter, maxInvoiceCounter) + 1;

  await db.posTerminalInfo.update({
    where: { id: terminalId },
    data: isTrainMode
      ? { resetCounterTrainNo: nextCounter }
      : { resetCounterNo: nextCounter },
  });

  return isTrainMode ? trainOffset + nextCounter : nextCounter;
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

  if (dto.settlementMode === "debt") {
    if (!dto.debt?.customerId?.trim()) {
      throw new Error("Customer is required for debt checkout");
    }

    if (!dto.debt?.dueDate?.trim()) {
      throw new Error("Due date is required for debt checkout");
    }

    if (dto.ePayments?.length) {
      throw new Error(
        "Reference payments are not supported during debt issuance",
      );
    }
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

function validateDebtPayment(
  calc: ReturnType<typeof calculatePayment>,
  upfrontCashAmount: number,
) {
  if (upfrontCashAmount < 0) {
    throw new Error("Upfront cash amount cannot be negative");
  }

  if (upfrontCashAmount > calc.totalAmount) {
    throw new Error("Upfront cash amount cannot exceed the total amount");
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
    fulfillmentType?: ReceiptDto["fulfillmentType"];
    tableNumber?: string | null;
    guestCount?: number | null;
    deliveryCustomerName?: string | null;
    deliveryAddress?: string | null;
    deliveryReference?: string | null;
    deliveryFee?: Prisma.Decimal | number | null;
  };
  terminal: Awaited<
    ReturnType<typeof getActiveTimestampForOrder>
  >["posTerminal"];
  cashierName: string | null;
  calc: ReturnType<typeof calculatePayment>;
  discount?: DiscountDto;
  items: ItemRequestDto[];
  productMap: ProductLookup;
  otherPayments: ReceiptDto["otherPayments"];
  stockUpdates: ReceiptDto["stockUpdates"];
  debt?: ReceiptDto["debt"];
}): ReceiptDto {
  const terminalVat = input.terminal.vat ?? 0;

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
    vatTinNumber: terminalVat > 0 ? input.terminal.vatTinNumber : null,
    minNumber: input.terminal.minNumber,
    terminalVat,
    cashierName: input.cashierName ?? "Unknown",
    isTrainMode: input.invoice.isTrainMode,
    fulfillmentType: input.invoice.fulfillmentType ?? "WALK_IN",
    tableNumber: input.invoice.tableNumber ?? null,
    guestCount: input.invoice.guestCount ?? null,
    deliveryCustomerName: input.invoice.deliveryCustomerName ?? null,
    deliveryAddress: input.invoice.deliveryAddress ?? null,
    deliveryReference: input.invoice.deliveryReference ?? null,
    deliveryFee:
      input.invoice.deliveryFee == null ? null : Number(input.invoice.deliveryFee),
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
    debt: input.debt ?? null,
    items: input.items.map((item) => ({
      id: item.productId,
      productName: input.productMap.get(item.productId)?.name ?? "Unknown",
      qty: item.qty,
      subTotal: item.status === "VOID" ? 0 : item.subTotal,
      status: item.status ?? ("PAID" satisfies OrderInvoiceStatusType),
      selections: item.selections,
      specialInstructions: item.specialInstructions ?? null,
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
  const quantitiesByProduct = new Map<string, number>();

  for (const item of items) {
    if (!productMap.get(item.productId)?.trackInventory) continue;
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.qty,
    );
  }

  const stockUpdates = await Promise.all(
    [...quantitiesByProduct.entries()].map(async ([productId, qty]) => {
      const result = await db.product.updateMany({
        where: {
          id: productId,
        },
        data: {
          quantity: { decrement: qty },
        },
      });

      if (result.count !== 1) {
        const product = productMap.get(productId);
        throw new Error(
          `Insufficient stock for "${product?.name ?? "Product"}". Please refresh and try again.`,
        );
      }

      const product = await db.product.findUnique({
        where: { id: productId },
        select: { quantity: true },
      });

      return {
        productId,
        remainingQuantity: Number(product?.quantity ?? 0),
      };
    }),
  );

  return stockUpdates;
}

async function createInvoiceItems(
  db: Prisma.TransactionClient,
  invoiceId: string,
  items: ItemRequestDto[],
  isTrainMode: boolean,
) {
  const hasSelections = items.some(
    (item) => item.selections?.length || item.specialInstructions?.trim(),
  );

  if (!hasSelections) {
    await db.item.createMany({
      data: items.map((item) => ({
        invoiceId,
        productId: item.productId,
        qty: item.qty,
        price: item.price,
        basePrice: item.basePrice ?? item.price,
        subTotal: item.status === "VOID" ? 0 : item.subTotal,
        status: item.status || ("PAID" satisfies InvoiceStatusType),
        isTrainingMode: isTrainMode,
      })),
    });
    return;
  }

  for (const item of items) {
    const created = await db.item.create({
      data: {
      invoiceId,
      productId: item.productId,
      qty: item.qty,
      price: item.price,
      basePrice: item.basePrice ?? item.price,
      subTotal: item.status === "VOID" ? 0 : item.subTotal,
      status: item.status || ("PAID" satisfies InvoiceStatusType),
      isTrainingMode: isTrainMode,
      specialInstructions: item.specialInstructions?.trim() || null,
      configurationSnapshot: item.selections?.length
        ? (item.selections as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      },
      select: { id: true },
    });

    if (item.selections?.length) {
      await db.orderItemSelection.createMany({
        data: item.selections.map((selection) => ({
          orderItemId: created.id,
          modifierGroupName: selection.modifierGroupName,
          modifierGroupType: selection.modifierGroupType,
          optionName: selection.optionName ?? null,
          priceDelta: selection.priceDelta,
          quantity: selection.quantity,
          sortOrder: selection.sortOrder,
        })),
      });
    }
  }
}

async function createInvoiceEPayments(
  db: Prisma.TransactionClient,
  invoiceId: string,
  ePaymentData: Awaited<ReturnType<typeof buildEPaymentData>> | undefined,
) {
  if (!ePaymentData?.length) return;

  await db.ePayment.createMany({
    data: ePaymentData.map((payment) => ({
      invoiceId,
      saleTypeId: payment.saleTypeId,
      reference: payment.reference,
      amount: payment.amount,
    })),
  });
}

async function resolveDebtApproval(params: {
  db: Prisma.TransactionClient;
  companyId: string;
  managerPin?: string;
  requiresApproval: boolean;
}) {
  if (!params.requiresApproval) {
    return null;
  }

  if (!params.managerPin?.trim()) {
    throw new Error("Manager approval PIN is required for debt checkout.");
  }

  const approver = await params.db.profile.findFirst({
    where: {
      companyId: params.companyId,
      pin: params.managerPin.trim(),
      role: { in: ["manager", "admin"] },
      status: "active",
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!approver) {
    throw new Error("Invalid manager PIN.");
  }

  return approver;
}

async function resolveDiscountApproval(params: {
  db: Prisma.TransactionClient;
  companyId: string;
  managerPin?: string;
  requiresApproval: boolean;
}) {
  if (!params.requiresApproval) {
    return null;
  }

  if (!params.managerPin?.trim()) {
    throw new Error(
      "Manager approval PIN is required for discounted checkout.",
    );
  }

  const approver = await params.db.profile.findFirst({
    where: {
      companyId: params.companyId,
      pin: params.managerPin.trim(),
      role: { in: ["manager", "admin"] },
      status: "active",
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!approver) {
    throw new Error("Invalid manager PIN.");
  }

  return approver;
}

async function resolveReturnApproval(params: {
  db: Prisma.TransactionClient;
  companyId: string;
  managerPin?: string;
}) {
  if (!params.managerPin?.trim()) {
    throw new Error("Manager approval PIN is required for returns.");
  }

  const approver = await params.db.profile.findFirst({
    where: {
      companyId: params.companyId,
      pin: params.managerPin.trim(),
      role: { in: ["manager", "admin"] },
      status: "active",
    },
    select: { id: true, fullName: true },
  });

  if (!approver) {
    throw new Error("Invalid manager PIN.");
  }

  return approver;
}

async function reserveNextReturnNumber(
  db: Prisma.TransactionClient,
  terminalId: string,
) {
  const latest = await db.invoiceReturn.findFirst({
    where: { terminalId },
    orderBy: { returnNumber: "desc" },
    select: { returnNumber: true },
  });

  return (latest?.returnNumber ?? 0) + 1;
}

function buildDebtReceiptDetails(input: {
  debtId: string;
  customerId: string;
  customerName: string;
  dueDate: Date;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  approvedByName?: string | null;
}) {
  const status =
    input.remainingAmount <= 0
      ? ("PAID" as const)
      : input.paidAmount > 0
        ? ("PARTIAL" as const)
        : ("UNPAID" as const);

  return {
    debtId: input.debtId,
    customerId: input.customerId,
    customerName: input.customerName,
    status,
    dueDate: toIsoDateString(input.dueDate),
    originalAmount: round2(input.originalAmount),
    paidAmount: round2(input.paidAmount),
    remainingAmount: round2(input.remainingAmount),
    notes: input.notes,
    upfrontCashAmount: round2(input.paidAmount),
    approvedByName: input.approvedByName ?? null,
  };
}

export const orderService = {
  async payOrder(dto: OrderDto): Promise<ReceiptDto> {
    const startedAt = performance.now();
    const timing: Record<string, number> = {};
    const mark = (stage: string, from: number) => {
      const now = performance.now();
      timing[stage] = Math.round(now - from);
      return now;
    };

    let stageStartedAt = startedAt;
    validateOrderRequest(dto);
    stageStartedAt = mark("validationMs", stageStartedAt);
    const discount = normalizeDiscount(dto.discount);
    const settlementMode = dto.settlementMode ?? "pay_now";

    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const companyId = profile.companyId;
    const activeTimestamp = await getActiveTimestampForOrder(
      companyId,
      dto.timestampId,
    );
    const terminal = activeTimestamp.posTerminal;
    mark("sessionMs", stageStartedAt);

    if (activeTimestamp.forceClosedAt) {
      throw new Error(
        "This terminal session was force-closed and needs review before syncing.",
      );
    }

    if (
      dto.deviceId &&
      activeTimestamp.deviceId &&
      dto.deviceId !== activeTimestamp.deviceId
    ) {
      throw new Error("This queued action belongs to a different device.");
    }

    let inventoryMs = 0;
    let receiptPreparationMs = 0;
    const transactionStartedAt = performance.now();

    try {
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

        const ePaymentData = dto.ePayments?.length
          ? await buildEPaymentData(tx, dto.ePayments)
          : undefined;

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
          discountCapValue: terminal.discountMax
            ? Number(terminal.discountMax)
            : null,
          cashTenderAmount: dto.cashTenderAmount,
          ePayments: dto.ePayments,
        });

        const upfrontCashAmount =
          settlementMode === "debt"
            ? round2(dto.debt?.upfrontCashAmount ?? dto.cashTenderAmount ?? 0)
            : calc.totalTendered;

        if (settlementMode === "debt") {
          validateDebtPayment(calc, upfrontCashAmount);
        } else {
          validatePayment(calc);
        }

        const invoiceNumber =
          dto.invoiceNumber ??
          (await reserveNextTerminalInvoiceNumber(
            tx,
            terminal.id,
            terminal.isTrainMode,
          ));

        let debtReceipt: ReceiptDto["debt"] = null;
        let customerNameOverride: string | undefined;
        let approvedById: string | null = null;
        let approvedByName: string | null = null;
        const discountApprover = await resolveDiscountApproval({
          db: tx,
          companyId,
          managerPin: discount?.managerPin,
          requiresApproval: Boolean(discount?.discountType),
        });
        const discountApprovedById = discountApprover?.id ?? null;

        if (settlementMode === "debt") {
          if (profile.role === "cashier" && !terminal.allowCashierDebtCreate) {
            throw new Error(
              "Cashier debt issuance is not allowed for this terminal.",
            );
          }

          const debtCustomer = await tx.customer.findFirst({
            where: {
              id: dto.debt!.customerId,
              companyId,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
            },
          });

          if (!debtCustomer) {
            throw new Error("Debt customer not found.");
          }

          customerNameOverride = debtCustomer.name;

          const dueDate = new Date(dto.debt!.dueDate);
          if (Number.isNaN(dueDate.getTime())) {
            throw new Error("Debt due date is invalid.");
          }

          if (upfrontCashAmount < 0 || upfrontCashAmount > calc.totalAmount) {
            throw new Error("Invalid upfront cash amount.");
          }

          const approver = await resolveDebtApproval({
            db: tx,
            companyId,
            managerPin: dto.debt?.managerPin,
            requiresApproval: terminal.requireManagerApprovalForDebt,
          });
          approvedById = approver?.id ?? null;
          approvedByName = approver?.fullName ?? null;

          const paidAmount = round2(upfrontCashAmount);
          const remainingAmount = round2(calc.totalAmount - paidAmount);
          const debtStatus =
            remainingAmount <= 0
              ? DebtStatus.PAID
              : paidAmount > 0
                ? DebtStatus.PARTIAL
                : DebtStatus.UNPAID;

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
              cashTendered: paidAmount,
              dueAmount: remainingAmount,
              totalTendered: paidAmount,
              changeAmount: 0,
              vatSales: calc.vatSales,
              vatExempt: calc.vatExempt,
              vatAmount: calc.vatAmount,
              vatZero: calc.vatZero,
              discountAmount: calc.discountAmount,

              customerName: customerNameOverride,
              eligibleDiscName: discount?.eligibleDiscName,
              oscaIdNum: discount?.oscaIdNum,
              discountType: discount?.discountType,
              discountPercent: getEffectiveDiscountPercent(
                discount,
                terminal.discountCapType === "percent"
                  ? terminal.discountMax
                    ? Number(terminal.discountMax)
                    : 0
                  : undefined,
              ),

              status:
                debtStatus === DebtStatus.PAID
                  ? ("PAID" satisfies InvoiceStatusType)
                  : ("PENDING" satisfies InvoiceStatusType),
              isTrainMode: terminal.isTrainMode,
              fulfillmentType: dto.fulfillmentType ?? "WALK_IN",
              tableNumber: dto.tableNumber?.trim() || null,
              guestCount: dto.guestCount ?? null,
              deliveryCustomerName: dto.deliveryCustomerName?.trim() || null,
              deliveryAddress: dto.deliveryAddress?.trim() || null,
              deliveryReference: dto.deliveryReference?.trim() || null,
              deliveryFee: dto.deliveryFee ?? null,
            },
            select: {
              id: true,
              invoiceNumber: true,
              createdAt: true,
              isTrainMode: true,
              localInvoiceNo: true,
              fulfillmentType: true,
              tableNumber: true,
              guestCount: true,
              deliveryCustomerName: true,
              deliveryAddress: true,
              deliveryReference: true,
              deliveryFee: true,
            },
          });

          await createInvoiceItems(
            tx,
            invoice.id,
            dto.items,
            terminal.isTrainMode,
          );

          const debt = await tx.customerDebt.create({
            data: {
              companyId,
              terminalId: terminal.id,
              customerId: debtCustomer.id,
              invoiceId: invoice.id,
              originalAmount: calc.totalAmount,
              paidAmount,
              remainingAmount,
              status: debtStatus,
              dueDate,
              paidAt: remainingAmount <= 0 ? invoice.createdAt : null,
              notes: dto.debt?.notes?.trim() || null,
              createdById: profile.id,
              approvedById,
            },
            select: {
              id: true,
            },
          });

          if (paidAmount > 0) {
            await tx.customerDebtPayment.create({
              data: {
                debtId: debt.id,
                companyId,
                terminalId: terminal.id,
                timestampId: activeTimestamp.id,
                amount: paidAmount,
                method: "CASH",
                referenceNo: null,
                notes: "Upfront cash collected during debt issuance",
                receivedById: profile.id,
              },
            });

            await auditLogService.create(tx, {
              companyId,
              actorProfileId: profile.id,
              posTerminalId: terminal.id,
              actionType: "DEBT_UPFRONT_PAYMENT_COLLECTED",
              referenceId: debt.id,
              changes: JSON.stringify({
                invoiceId: invoice.id,
                customerId: debtCustomer.id,
                method: "CASH",
                remainingAmount,
              }),
              amount: paidAmount,
            });
          }

          const inventoryStartedAt = performance.now();
          const stockUpdates = !terminal.isTrainMode
            ? await deductStock(tx, dto.items, transactionProductMap)
            : [];
          inventoryMs += Math.round(performance.now() - inventoryStartedAt);

          await auditLogService.create(tx, {
            companyId,
            actorProfileId: profile.id,
            posTerminalId: terminal.id,
            actionType: "DEBT_CREATED",
            referenceId: debt.id,
            changes: JSON.stringify({
              invoiceId: invoice.id,
              customerId: debtCustomer.id,
              dueDate: dueDate.toISOString(),
              originalAmount: calc.totalAmount,
              paidAmount,
              remainingAmount,
              cashierId: activeTimestamp.cashierId,
              approvedById,
            }),
            amount: calc.totalAmount,
          });

          if (discountApprovedById) {
            await auditLogService.create(tx, {
              companyId,
              actorProfileId: discountApprovedById,
              posTerminalId: terminal.id,
              actionType: "DISCOUNT_APPROVED",
              referenceId: invoice.id,
              changes: JSON.stringify({
                discountType: discount?.discountType,
                discountAmount: calc.discountAmount,
                cashierId: activeTimestamp.cashierId,
              }),
              amount: calc.discountAmount,
            });
          }

          if (approvedById) {
            await auditLogService.create(tx, {
              companyId,
              actorProfileId: approvedById,
              posTerminalId: terminal.id,
              actionType: "DEBT_APPROVED",
              referenceId: debt.id,
              changes: `Approved debt issuance for invoice ${invoice.id}`,
              amount: calc.totalAmount,
            });
          }

          debtReceipt = buildDebtReceiptDetails({
            debtId: debt.id,
            customerId: debtCustomer.id,
            customerName: debtCustomer.name,
            dueDate,
            originalAmount: calc.totalAmount,
            paidAmount,
            remainingAmount,
            notes: dto.debt?.notes?.trim() || null,
            approvedByName,
          });

          const receiptStartedAt = performance.now();
          const receipt = buildReceiptFromOrder({
            invoice,
            terminal,
            cashierName: activeTimestamp.cashier.fullName,
            calc: {
              ...calc,
              cashTendered: paidAmount,
              totalTendered: paidAmount,
              dueAmount: remainingAmount,
              changeAmount: 0,
            },
            discount,
            items: dto.items,
            productMap: transactionProductMap,
            otherPayments: [],
            stockUpdates,
            debt: debtReceipt,
          });
          receiptPreparationMs += Math.round(
            performance.now() - receiptStartedAt,
          );
          return receipt;
        }

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
                ? terminal.discountMax
                  ? Number(terminal.discountMax)
                  : 0
                : undefined,
            ),

            status: "PAID" satisfies InvoiceStatusType,
            isTrainMode: terminal.isTrainMode,
            fulfillmentType: dto.fulfillmentType ?? "WALK_IN",
            tableNumber: dto.tableNumber?.trim() || null,
            guestCount: dto.guestCount ?? null,
            deliveryCustomerName: dto.deliveryCustomerName?.trim() || null,
            deliveryAddress: dto.deliveryAddress?.trim() || null,
            deliveryReference: dto.deliveryReference?.trim() || null,
            deliveryFee: dto.deliveryFee ?? null,
          },
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
            isTrainMode: true,
            localInvoiceNo: true,
            fulfillmentType: true,
            tableNumber: true,
            guestCount: true,
            deliveryCustomerName: true,
            deliveryAddress: true,
            deliveryReference: true,
            deliveryFee: true,
          },
        });

        await createInvoiceItems(
          tx,
          invoice.id,
          dto.items,
          terminal.isTrainMode,
        );
        await createInvoiceEPayments(tx, invoice.id, ePaymentData);

        const inventoryStartedAt = performance.now();
        const stockUpdates = !terminal.isTrainMode
          ? await deductStock(tx, dto.items, transactionProductMap)
          : [];
        inventoryMs += Math.round(performance.now() - inventoryStartedAt);

        await auditLogService.create(tx, {
          companyId,
          actorProfileId: profile.id,
          posTerminalId: terminal.id,
          actionType: "SALE_COMPLETED",
          referenceId: invoice.id,
          changes: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            cashTendered: calc.cashTendered,
            totalTendered: calc.totalTendered,
            changeAmount: calc.changeAmount,
            discountType: discount?.discountType ?? null,
            discountAmount: calc.discountAmount,
            discountApprovedById,
            referencePaymentTotal:
              ePaymentData?.reduce((sum, payment) => sum + payment.amount, 0) ??
              0,
            referencePayments:
              ePaymentData?.map((payment) => ({
                saleTypeId: payment.saleTypeId,
                name: payment.name,
                amount: payment.amount,
                reference: payment.reference,
              })) ?? [],
            itemCount: dto.items.length,
            cashierId: activeTimestamp.cashierId,
          }),
          amount: calc.totalAmount,
        });

        if (discountApprovedById) {
          await auditLogService.create(tx, {
            companyId,
            actorProfileId: discountApprovedById,
            posTerminalId: terminal.id,
            actionType: "DISCOUNT_APPROVED",
            referenceId: invoice.id,
            changes: JSON.stringify({
              discountType: discount?.discountType,
              discountAmount: calc.discountAmount,
              cashierId: activeTimestamp.cashierId,
            }),
            amount: calc.discountAmount,
          });
        }

        const receiptStartedAt = performance.now();
        const receipt = buildReceiptFromOrder({
          invoice,
          terminal,
          cashierName: activeTimestamp.cashier.fullName,
          calc,
          discount,
          items: dto.items,
          productMap: transactionProductMap,
          otherPayments:
            ePaymentData?.map((payment) => ({
              name: payment.name,
              amount: payment.amount,
              reference: payment.reference,
            })) ?? [],
          stockUpdates,
          debt: null,
        });
        receiptPreparationMs += Math.round(
          performance.now() - receiptStartedAt,
        );
        return receipt;
      });
      timing.transactionMs = Math.round(
        performance.now() - transactionStartedAt,
      );
      timing.inventoryMs = inventoryMs;
      timing.receiptPreparationMs = receiptPreparationMs;
      timing.totalMs = Math.round(performance.now() - startedAt);
      console.info("POS checkout timing", timing);

      return receipt;
    } catch (error) {
      if (
        dto.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingInvoice = await findInvoiceByIdempotencyKey(
          prisma,
          dto.idempotencyKey,
        );

        if (existingInvoice) {
          timing.transactionMs = Math.round(
            performance.now() - transactionStartedAt,
          );
          timing.inventoryMs = inventoryMs;
          timing.receiptPreparationMs = receiptPreparationMs;
          timing.totalMs = Math.round(performance.now() - startedAt);
          console.info("POS checkout timing", {
            ...timing,
            idempotencyReplay: true,
          });
          return mapInvoiceToReceipt(existingInvoice);
        }
      }

      throw error;
    }
  },

  async archiveReceipt(receipt: ReceiptDto): Promise<void> {
    const printPayload = receiptPrintService.buildPayload(receipt);

    await printArchiveService.createInvoiceArchiveIfMissing({
      content: printPayload.archiveContent,
      invoiceId: receipt.id,
      isTrainMode: receipt.isTrainMode,
    });
  },

  async returnInvoice(dto: ReturnInvoiceDto): Promise<{ returnId: string; returnNumber: number; totalReturned: number }> {
    const profile = await getCurrentProfile();
    if (!profile.companyId) throw new Error("User has no assigned company");
    const companyId = profile.companyId;
    if (!dto.invoiceId?.trim()) throw new Error("Invoice is required.");
    if (!dto.reason?.trim()) throw new Error("Return reason is required.");
    const requestedItems = dto.items.filter((item) => item.quantity > 0);
    if (requestedItems.length === 0) throw new Error("Select at least one item to return.");

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: dto.invoiceId,
          posTerminal: { companyId },
          status: { in: ["PAID", "RETURNED"] },
        },
        include: {
          posTerminal: { select: { id: true, companyId: true, isTrainMode: true, posName: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, trackInventory: true } },
              selections: {
                orderBy: { sortOrder: "asc" },
                select: {
                  modifierGroupName: true,
                  modifierGroupType: true,
                  optionName: true,
                  priceDelta: true,
                  quantity: true,
                  sortOrder: true,
                },
              },
              returnItems: { select: { returnedQty: true } },
            },
          },
          returns: { select: { totalReturned: true } },
        },
      });

      if (!invoice) {
        throw new Error("Invoice is not returnable or was not found.");
      }

      const approver = await resolveReturnApproval({
        db: tx,
        companyId,
        managerPin: dto.managerPin,
      });

      const itemMap = new Map(invoice.items.map((item) => [item.id, item]));
      const returnLines = requestedItems.map((request) => {
        const item = itemMap.get(request.invoiceItemId);
        if (!item || item.status === "VOID" || item.status === "CANCELLED") {
          throw new Error("One or more selected items cannot be returned.");
        }

        const soldQty = Number(item.qty);
        const alreadyReturned = item.returnItems.reduce(
          (sum, returnItem) => sum + Number(returnItem.returnedQty),
          0,
        );
        const remainingQty = round2(soldQty - alreadyReturned);
        const requestedQty = round2(request.quantity);

        if (requestedQty <= 0 || requestedQty > remainingQty) {
          throw new Error(`Return quantity for ${item.product.name} exceeds the remaining sold quantity.`);
        }

        const unitAmount = soldQty > 0 ? Number(item.subTotal) / soldQty : Number(item.price);
        const lineAmount = round2(unitAmount * requestedQty);

        return {
          item,
          requestedQty,
          remainingAfterReturn: round2(remainingQty - requestedQty),
          lineAmount,
        };
      });

      const subtotalReturned = round2(returnLines.reduce((sum, line) => sum + line.lineAmount, 0));
      const priorReturned = invoice.returns.reduce(
        (sum, invoiceReturn) => sum + Number(invoiceReturn.totalReturned),
        0,
      );
      const totalReturned = round2(subtotalReturned);
      const nextReturnedAmount = round2(priorReturned + totalReturned);
      const invoiceTotal = Number(invoice.totalAmount);
      const allRemainingReturned = invoice.items.every((item) => {
        const line = returnLines.find((returnLine) => returnLine.item.id === item.id);
        if (line) return line.remainingAfterReturn <= 0;
        const alreadyReturned = item.returnItems.reduce(
          (sum, returnItem) => sum + Number(returnItem.returnedQty),
          0,
        );
        return Number(item.qty) - alreadyReturned <= 0;
      });

      if (nextReturnedAmount - invoiceTotal > 0.01) {
        throw new Error("Return total exceeds the original invoice amount.");
      }

      const invoiceReturn = await tx.invoiceReturn.create({
        data: {
          companyId,
          terminalId: invoice.posTerminal.id,
          invoiceId: invoice.id,
          returnNumber: await reserveNextReturnNumber(tx, invoice.posTerminal.id),
          returnType: allRemainingReturned ? "FULL" : "PARTIAL",
          reason: dto.reason.trim(),
          notes: dto.notes?.trim() || null,
          subtotalReturned,
          totalReturned,
          processedById: profile.id,
          approvedById: approver.id,
          items: {
            create: returnLines.map((line) => ({
              invoiceItemId: line.item.id,
              productId: line.item.productId,
              returnedQty: line.requestedQty,
              unitPriceSnapshot: line.item.price,
              lineAmount: line.lineAmount,
              productNameSnapshot: line.item.product.name,
              selectionsSnapshot:
                line.item.selections.length > 0 || line.item.specialInstructions?.trim()
                  ? ({
                      selections: line.item.selections,
                      specialInstructions: line.item.specialInstructions ?? null,
                    } as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
            })),
          },
        },
        select: { id: true, returnNumber: true, returnType: true },
      });

      for (const line of returnLines) {
        if (line.remainingAfterReturn <= 0) {
          await tx.item.update({
            where: { id: line.item.id },
            data: { status: "RETURNED" },
          });
        }

        if (!invoice.posTerminal.isTrainMode && line.item.product.trackInventory) {
          await tx.product.update({
            where: { id: line.item.productId },
            data: { quantity: { increment: line.requestedQty } },
          });
          await tx.inventory.create({
            data: {
              productId: line.item.productId,
              quantity: line.requestedQty,
              type: "IN",
              reference: `Return R-${invoiceReturn.returnNumber} / Invoice ${invoice.invoiceNumber}`,
            },
          });
        }
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          returnedAmount: nextReturnedAmount,
          status: allRemainingReturned ? "RETURNED" : "PAID",
          reason: dto.reason.trim(),
          voidedById: approver.id,
        },
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: profile.id,
        posTerminalId: invoice.posTerminal.id,
        actionType: allRemainingReturned ? "INVOICE_RETURNED_FULL" : "INVOICE_RETURNED_PARTIAL",
        referenceId: invoice.id,
        changes: JSON.stringify({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          returnId: invoiceReturn.id,
          returnNumber: invoiceReturn.returnNumber,
          returnType: invoiceReturn.returnType,
          reason: dto.reason.trim(),
          notes: dto.notes?.trim() || null,
          approvedById: approver.id,
          approvedByName: approver.fullName,
          items: returnLines.map((line) => ({
            invoiceItemId: line.item.id,
            productId: line.item.productId,
            productName: line.item.product.name,
            returnedQty: line.requestedQty,
            lineAmount: line.lineAmount,
          })),
          totalReturned,
        }),
        amount: totalReturned,
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: approver.id,
        posTerminalId: invoice.posTerminal.id,
        actionType: "RETURN_APPROVED",
        referenceId: invoice.id,
        changes: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          returnNumber: invoiceReturn.returnNumber,
          approvedForProfileId: profile.id,
          totalReturned,
        }),
        amount: totalReturned,
      });

      return {
        returnId: invoiceReturn.id,
        returnNumber: invoiceReturn.returnNumber,
        totalReturned,
      };
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
    const companyId = profile.companyId;
    const activeTimestamp = await getActiveTimestampForOrder(
      companyId,
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
      discountCapValue: terminal.discountMax
        ? Number(terminal.discountMax)
        : null,
      cashTenderAmount: dto.order.cashTenderAmount,
      ePayments: dto.order.ePayments,
    });

    await prisma.$transaction(async (tx) => {
      const invoiceNumber = await reserveNextTerminalInvoiceNumber(
        tx,
        terminal.id,
        terminal.isTrainMode,
      );

      const voidInvoice = await tx.invoice.create({
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
        select: {
          id: true,
          invoiceNumber: true,
        },
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: manager.id,
        posTerminalId: terminal.id,
        actionType: "ORDER_VOIDED",
        referenceId: voidInvoice.id,
        changes: JSON.stringify({
          invoiceNumber: voidInvoice.invoiceNumber,
          reason: dto.reason,
          cashierId: activeTimestamp.cashierId,
          itemCount: dto.order.items.length,
          grossAmount: calc.grossAmount,
        }),
        amount: calc.grossAmount,
      });

    });
  },
};

async function buildEPaymentData(
  db: Prisma.TransactionClient | typeof prisma,
  ePayments: EPaymentDto[],
) {
  const saleTypeIds = ePayments.map((p) => p.saleTypeId);
  const uniqueSaleTypeIds = [...new Set(saleTypeIds)];

  const saleTypes = await db.saleType.findMany({
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
