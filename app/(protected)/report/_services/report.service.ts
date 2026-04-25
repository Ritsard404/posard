import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { receiptPrintService } from "@/app/(protected)/pos/_services/receipt-print.service";
import { printConfigService } from "@/app/(protected)/pos/_services/print-config.service";
import { formatInvoiceNumber } from "@/app/(protected)/pos/_services/print-format.service";
import { printArchiveService } from "@/app/(protected)/pos/_services/print-archive.service";
import type {
  AuditTrailDto,
  AuditTrailItemDto,
  DailyTransactionsDto,
  DailyTransactionItemDto,
  DiscountReportDto,
  RefundInvoiceItemDto,
  RefundInvoicesDto,
  ReportCompaniesWorkspaceDto,
  ReportCompanyContextDto,
  ReportCompanyListItemDto,
  ReportDateRangeDto,
  ReportInvoicePrintPayloadDto,
  ReportOverviewDto,
  ReportPaginationDto,
  ReportPaymentBreakdownDto,
  ReportTerminalContextDto,
  ReportWorkspaceDto,
  ReportViewerDto,
  ReturnedInvoiceRecordItemDto,
  ReturnedInvoiceRecordsDto,
  ReturnedItemDto,
  ReturnedItemsDto,
  SalesReportDto,
  SalesReportItemDto,
  SalesBookDto,
  SalesBookItemDto,
  TransactionHistoryDto,
  TransactionHistoryItemDto,
  TransactionListDto,
  TransactionListItemDto,
  TransactionListTotalsDto,
  VoidedListDto,
  VoidedListItemDto,
  XReadingDto,
  ZReadingDto,
} from "./_dto/report.dto";
import type { ReportSortOrder } from "../_components/report-workspace-config";

interface ReportScopeInput {
  companyId?: string;
  terminalId?: string;
  sortOrder?: ReportSortOrder;
}

interface ReportRangeInput extends ReportScopeInput {
  from: Date;
  to: Date;
}

interface ReportPaginationInput {
  page: number;
  pageSize: number;
}

interface ReportPagedRangeInput extends ReportRangeInput, ReportPaginationInput {}

function isOldestFirst(sortOrder?: ReportSortOrder) {
  return sortOrder === "oldest";
}

interface ReportCompaniesQueryInput {
  page: number;
  size: number;
  keyword: string;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function getPaymentMethodName(name: string | null | undefined) {
  return name?.trim() || "Unlabeled payment method";
}

function isVoidInvoice(invoice: { status: string }) {
  return invoice.status === "VOID" || invoice.status === "CANCELLED";
}

function calculateVoidAmount(invoice: {
  grossAmount: unknown;
  totalAmount: unknown;
}) {
  const totalAmount = toNumber(invoice.totalAmount);
  return totalAmount > 0 ? totalAmount : toNumber(invoice.grossAmount);
}

function createRange(from: Date, to: Date): ReportDateRangeDto {
  return { from, to };
}

function createPagination(
  page: number,
  pageSize: number,
  totalItems: number,
): ReportPaginationDto {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

function normalizeStartOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeEndOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function calculateCashCollected(invoice: {
  cashTendered: unknown;
  changeAmount: unknown;
  returnedAmount: unknown;
}) {
  return (
    toNumber(invoice.cashTendered) -
    toNumber(invoice.changeAmount) -
    toNumber(invoice.returnedAmount)
  );
}

function buildPaymentBreakdown(
  invoices: Array<{
    ePayments: Array<{
      amount: unknown;
      saleType?: { name: string | null } | null;
    }>;
  }>,
): ReportPaymentBreakdownDto[] {
  const paymentMap = new Map<string, ReportPaymentBreakdownDto>();

  for (const invoice of invoices) {
    for (const payment of invoice.ePayments) {
      const key = getPaymentMethodName(payment.saleType?.name);
      const current = paymentMap.get(key);

      if (current) {
        current.count += 1;
        current.amount += toNumber(payment.amount);
        continue;
      }

      paymentMap.set(key, {
        name: key,
        count: 1,
        amount: toNumber(payment.amount),
      });
    }
  }

  return [...paymentMap.values()].sort((a, b) => b.amount - a.amount);
}

async function resolveCompanyScope(
  viewer: ReportViewerDto,
  input: ReportScopeInput = {},
) {
  const companyId = input.companyId ?? viewer.companyId;

  if (!companyId) {
    throw new Error("No company selected for reports.");
  }

  if (viewer.role !== "admin" && companyId !== viewer.companyId) {
    throw new Error("You do not have access to this company.");
  }

  if (input.terminalId) {
    const terminal = await prisma.posTerminalInfo.findFirst({
      where: {
        id: input.terminalId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!terminal) {
      throw new Error("Terminal not found for the selected company.");
    }
  }

  return { companyId, terminalId: input.terminalId ?? null };
}

async function getCompanySummary(companyId: string): Promise<ReportCompanyContextDto> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
      phone: true,
      posTerminals: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  return {
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code,
    companyEmail: company.email,
    companyPhone: company.phone,
    terminalCount: company.posTerminals.length,
    activeTerminalCount: company.posTerminals.filter((terminal) => terminal.isActive)
      .length,
  };
}

async function getInvoicesForRange(
  companyId: string,
  from: Date,
  to: Date,
  terminalId?: string | null,
) {
  return prisma.invoice.findMany({
    where: {
      posTerminal: {
        companyId,
        ...(terminalId ? { id: terminalId } : {}),
      },
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    include: {
      cashier: {
        select: {
          fullName: true,
        },
      },
      posTerminal: {
        select: {
          id: true,
          posName: true,
        },
      },
      ePayments: {
        include: {
          saleType: {
            select: {
              name: true,
            },
          },
        },
      },
      items: {
        include: {
          product: {
            include: {
              category: {
                select: {
                  categoryName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

function createInvoiceWhere(
  companyId: string,
  from: Date,
  to: Date,
  terminalId?: string | null,
): Prisma.InvoiceWhereInput {
  return {
    posTerminal: {
      companyId,
      ...(terminalId ? { id: terminalId } : {}),
    },
    createdAt: {
      gte: from,
      lte: to,
    },
  };
}

function createItemWhere(
  companyId: string,
  from: Date,
  to: Date,
  terminalId?: string | null,
): Prisma.ItemWhereInput {
  return {
    status: {
      not: "VOID",
    },
    invoice: {
      status: {
        notIn: ["VOID", "CANCELLED"],
      },
      posTerminal: {
        companyId,
        ...(terminalId ? { id: terminalId } : {}),
      },
      createdAt: {
        gte: from,
        lte: to,
      },
    },
  };
}

function calculateRefundRatio(totalAmount: unknown, returnedAmount: unknown) {
  const total = toNumber(totalAmount);

  if (total <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, toNumber(returnedAmount) / total));
}

function createTransactionListTotals(): TransactionListTotalsDto {
  return {
    totalGrossSales: 0,
    totalReturns: 0,
    totalNetOfReturns: 0,
    totalDiscounts: 0,
    totalNetSales: 0,
    totalVatable: 0,
    totalExempt: 0,
    totalVat: 0,
  };
}

function getTerminalSerialNumber(terminal: {
  ptuNumber?: string | null;
  accreditationNumber?: string | null;
}) {
  return terminal.ptuNumber?.trim() || terminal.accreditationNumber?.trim() || "N/A";
}

async function buildXReadingFromTimestamp(timestamp: {
  timestampIn: Date | null;
  timestampOut: Date | null;
  cashInDrawerAmount: unknown;
  withdrawnDrawerAmount: unknown;
  cashOutDrawerAmount: unknown;
  posTerminalId: string;
  cashier: {
    fullName: string | null;
  };
  posTerminal: {
    id: string;
    posName: string | null;
    registeredName: string | null;
    operatedBy: string | null;
    address: string | null;
    vatTinNumber: string | null;
    minNumber: string | null;
    ptuNumber: string | null;
    accreditationNumber: string | null;
    isTrainMode: boolean;
    vat: Prisma.Decimal | number | null;
  };
}, companyId: string, sortOrder?: ReportSortOrder): Promise<XReadingDto> {
  if (!timestamp.timestampIn) {
    throw new Error("No terminal session available for X-reading.");
  }

  const readingEnd = timestamp.timestampOut ?? new Date();
  const invoices = await getInvoicesForRange(
    companyId,
    timestamp.timestampIn,
    readingEnd,
    timestamp.posTerminalId,
  );
  const unreadInvoices = invoices.filter((invoice) => !invoice.isRead);
  const paidInvoices = unreadInvoices.filter((invoice) => invoice.status === "PAID");
  const voidInvoices = unreadInvoices.filter(isVoidInvoice);
  const returnedInvoices = unreadInvoices.filter(
    (invoice) => invoice.status === "RETURNED",
  );

  const openingFund = toNumber(timestamp.cashInDrawerAmount);
  const withdrawalAmount = toNumber(timestamp.withdrawnDrawerAmount);
  const refundAmount = returnedInvoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.returnedAmount),
    0,
  );
  const cashSales = paidInvoices.reduce(
    (sum, invoice) => sum + calculateCashCollected(invoice),
    0,
  );
  const expectedCash = openingFund + cashSales - withdrawalAmount;
  const actualCash = toNumber(timestamp.cashOutDrawerAmount);
  const sortedInvoiceNumbers = unreadInvoices
    .map((invoice) => invoice.invoiceNumber)
    .sort((a, b) => a - b);
  const xReadingInvoices = unreadInvoices.map((invoice) => {
    const referencePayments = invoice.ePayments.map((payment) => ({
      name: getPaymentMethodName(payment.saleType.name),
      count: 1,
      amount: toNumber(payment.amount),
    }));

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      status: invoice.status,
      cashierName: invoice.cashier.fullName ?? "Unknown",
      terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
      customerName: invoice.customerName,
      totalAmount: toNumber(invoice.totalAmount),
      cashCollected: calculateCashCollected(invoice),
      referencePayments,
      referencePaymentAmount: referencePayments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      ),
      discountAmount: toNumber(invoice.discountAmount),
      returnedAmount: toNumber(invoice.returnedAmount),
      isTrainMode: invoice.isTrainMode,
    };
  }).sort((a, b) =>
    isOldestFirst(sortOrder)
      ? a.createdAt.getTime() - b.createdAt.getTime()
      : b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return {
    generatedAt: new Date(),
    range: createRange(timestamp.timestampIn, readingEnd),
    terminalId: timestamp.posTerminal.id,
    terminalName: timestamp.posTerminal.posName ?? "Unnamed terminal",
    businessName: timestamp.posTerminal.registeredName ?? "N/A",
    operatorName: timestamp.posTerminal.operatedBy ?? "N/A",
    addressLine: timestamp.posTerminal.address ?? "N/A",
    vatRegTin: timestamp.posTerminal.vatTinNumber ?? "",
    minNumber: timestamp.posTerminal.minNumber ?? "",
    serialNumber: getTerminalSerialNumber(timestamp.posTerminal),
    isTrainMode: timestamp.posTerminal.isTrainMode,
    isAcknowledgement: toNumber(timestamp.posTerminal.vat) <= 0,
    cashierName: timestamp.cashier.fullName ?? "Unknown",
    invoiceCount: unreadInvoices.length,
    beginningOrNumber: sortedInvoiceNumbers.length
      ? formatInvoiceNumber(sortedInvoiceNumbers[0]!)
      : "N/A",
    endingOrNumber: sortedInvoiceNumbers.length
      ? formatInvoiceNumber(sortedInvoiceNumbers[sortedInvoiceNumbers.length - 1]!)
      : "N/A",
    openingFund,
    withdrawalAmount,
    refundAmount,
    refundCount: returnedInvoices.length,
    voidAmount: voidInvoices.reduce(
      (sum, invoice) => sum + calculateVoidAmount(invoice),
      0,
    ),
    voidCount: voidInvoices.length,
    expectedCash,
    actualCash,
    shortOver: actualCash - expectedCash - refundAmount,
    cashSales,
    otherPayments: buildPaymentBreakdown(paidInvoices),
    paymentsReceived:
      cashSales +
      paidInvoices.reduce(
        (sum, invoice) =>
          sum +
          invoice.ePayments.reduce(
            (paymentTotal, payment) => paymentTotal + toNumber(payment.amount),
            0,
          ),
        0,
      ),
    invoices: xReadingInvoices,
  };
}

function updateTransactionListTotals(
  totals: TransactionListTotalsDto,
  input: {
    grossSales: number;
    returns: number;
    lessDiscount: number;
    netOfSales: number;
    vatable: number;
    exempt: number;
    vat: number;
  },
) {
  totals.totalGrossSales += input.grossSales;
  totals.totalReturns += input.returns;
  totals.totalNetOfReturns += input.grossSales - input.returns;
  totals.totalDiscounts += input.lessDiscount;
  totals.totalNetSales += input.netOfSales;
  totals.totalVatable += input.vatable;
  totals.totalExempt += input.exempt;
  totals.totalVat += input.vat;
}

export const reportService = {
  async getAdminCompaniesWorkspace(
    viewer: ReportViewerDto,
    query: ReportCompaniesQueryInput,
  ): Promise<ReportCompaniesWorkspaceDto> {
    if (viewer.role !== "admin") {
      throw new Error("You do not have access to global reports.");
    }

    const where = query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: "insensitive" as const } },
            { email: { contains: query.keyword, mode: "insensitive" as const } },
          ],
        }
      : {};

    const skip = query.page * query.size;

    const [totalCount, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        skip,
        take: query.size,
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          users: {
            where: {
              role: "manager",
              status: "active",
            },
            select: {
              fullName: true,
            },
            orderBy: [{ approvedAt: "asc" }, { createdAt: "asc" }],
            take: 1,
          },
          posTerminals: {
            select: {
              isActive: true,
            },
          },
        },
      }),
    ]);

    const items: ReportCompanyListItemDto[] = companies.map((company) => ({
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      ownerManagerName: company.users[0]?.fullName ?? null,
      createdAt: company.createdAt,
      terminalCount: company.posTerminals.length,
      activeTerminalCount: company.posTerminals.filter((terminal) => terminal.isActive)
        .length,
    }));

    return {
      items,
      totalCount,
      page: query.page,
      size: query.size,
      totalPages: Math.max(1, Math.ceil(totalCount / query.size)),
      keyword: query.keyword,
    };
  },

  async getCompanyContext(
    viewer: ReportViewerDto,
    companyId: string,
  ): Promise<ReportCompanyContextDto> {
    await resolveCompanyScope(viewer, { companyId });
    return getCompanySummary(companyId);
  },

  async getTerminalContext(
    viewer: ReportViewerDto,
    companyId: string,
    terminalId: string,
  ): Promise<ReportTerminalContextDto> {
    await resolveCompanyScope(viewer, { companyId, terminalId });

    const terminal = await prisma.posTerminalInfo.findFirst({
      where: {
        id: terminalId,
        companyId,
      },
      select: {
        id: true,
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
        isActive: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!terminal) {
      throw new Error("Terminal not found for the selected company.");
    }

    return {
      companyId: terminal.company.id,
      companyName: terminal.company.name,
      terminalId: terminal.id,
      terminalName: terminal.posName ?? "Unnamed terminal",
      printerName: terminal.printerName || null,
      printerConfig: printConfigService.mapPrinterConfig(terminal),
      isActive: terminal.isActive,
    };
  },

  async getWorkspace(
    viewer: ReportViewerDto,
    input: ReportScopeInput = {},
  ): Promise<ReportWorkspaceDto> {
    const companyId = input.companyId ?? viewer.companyId;

    if (!companyId) {
      return {
        companyId: null,
        companyName: null,
        terminals: [],
      };
    }

    if (viewer.role !== "admin" && companyId !== viewer.companyId) {
      throw new Error("You do not have access to this company.");
    }

    const [company, terminals] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
        },
      }),
      prisma.posTerminalInfo.findMany({
        where: {
          companyId,
        },
        select: {
          id: true,
          posName: true,
          isActive: true,
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
        },
        orderBy: {
          posName: "asc",
        },
      }),
    ]);

    if (!company) {
      throw new Error("Company not found.");
    }

    return {
      companyId,
      companyName: company.name,
      terminals: terminals.map((terminal) => ({
        id: terminal.id,
        name: terminal.posName ?? "Unnamed terminal",
        isActive: terminal.isActive,
        printerName: terminal.printerName || null,
        printerConfig: printConfigService.mapPrinterConfig(terminal),
      })),
    };
  },

  async getOverview(
    viewer: ReportViewerDto,
    input: ReportRangeInput,
  ): Promise<ReportOverviewDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const invoices = await getInvoicesForRange(companyId, input.from, input.to, terminalId);

    const [activeSessionCount, unreadInvoiceCount, pendingTerminalRequests] =
      await Promise.all([
        prisma.timestamp.count({
          where: {
            posTerminal: {
              companyId,
              ...(terminalId ? { id: terminalId } : {}),
            },
            timestampOut: null,
          },
        }),
        prisma.invoice.count({
          where: {
            posTerminal: {
              companyId,
              ...(terminalId ? { id: terminalId } : {}),
            },
            isRead: false,
          },
        }),
        prisma.terminalRequest.count({
          where: {
            companyId,
            status: "pending",
          },
        }),
      ]);

    const paidInvoices = invoices.filter((invoice) => invoice.status === "PAID");
    const voidInvoices = invoices.filter(isVoidInvoice);
    const returnedInvoices = invoices.filter(
      (invoice) => invoice.status === "RETURNED",
    );

    return {
      range: createRange(input.from, input.to),
      totalSales: paidInvoices.reduce(
        (sum, invoice) =>
          sum +
          toNumber(invoice.totalAmount) -
          toNumber(invoice.discountAmount) -
          toNumber(invoice.returnedAmount),
        0,
      ),
      totalTransactions: paidInvoices.length,
      totalReturns: returnedInvoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.returnedAmount),
        0,
      ),
      totalVoids: voidInvoices.reduce(
        (sum, invoice) => sum + calculateVoidAmount(invoice),
        0,
      ),
      totalDiscounts: paidInvoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.discountAmount),
        0,
      ),
      totalCashSales: paidInvoices.reduce(
        (sum, invoice) => sum + calculateCashCollected(invoice),
        0,
      ),
      totalEPaymentSales: paidInvoices.reduce(
        (sum, invoice) =>
          sum +
          invoice.ePayments.reduce(
            (paymentTotal, payment) => paymentTotal + toNumber(payment.amount),
            0,
          ),
        0,
      ),
      activeSessionCount,
      unreadInvoiceCount,
      pendingTerminalRequests,
      paymentBreakdown: buildPaymentBreakdown(paidInvoices),
    };
  },

  async getXReading(
    viewer: ReportViewerDto,
    input: ReportScopeInput = {},
  ): Promise<XReadingDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);

    const timestamp = await prisma.timestamp.findFirst({
      where: {
        posTerminal: {
          companyId,
          ...(terminalId ? { id: terminalId } : {}),
        },
      },
      include: {
        cashier: {
          select: {
            fullName: true,
          },
        },
        posTerminal: {
          select: {
            id: true,
            posName: true,
            registeredName: true,
            operatedBy: true,
            address: true,
            vatTinNumber: true,
            minNumber: true,
            ptuNumber: true,
            accreditationNumber: true,
            isTrainMode: true,
            vat: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!timestamp?.timestampIn) {
      throw new Error("No terminal session available for X-reading.");
    }

    return buildXReadingFromTimestamp(timestamp, companyId, input.sortOrder);
  },

  async getZReading(
    viewer: ReportViewerDto,
    input: ReportRangeInput,
  ): Promise<ZReadingDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const invoices = await getInvoicesForRange(companyId, input.from, input.to, terminalId);
    const timestamps = await prisma.timestamp.findMany({
      where: {
        posTerminal: {
          companyId,
          ...(terminalId ? { id: terminalId } : {}),
        },
        OR: [
          {
            timestampIn: {
              gte: input.from,
              lte: input.to,
            },
          },
          {
            timestampOut: {
              gte: input.from,
              lte: input.to,
            },
          },
        ],
      },
      include: {
        posTerminal: {
          select: {
            id: true,
            posName: true,
            registeredName: true,
            operatedBy: true,
            address: true,
            vatTinNumber: true,
            minNumber: true,
            ptuNumber: true,
            accreditationNumber: true,
            isTrainMode: true,
            vat: true,
            resetCounterNo: true,
            resetCounterTrainNo: true,
            zCounterNo: true,
            zCounterTrainNo: true,
          },
        },
      },
    });

    const paidInvoices = invoices.filter((invoice) => invoice.status === "PAID");
    const voidInvoices = invoices.filter(isVoidInvoice);
    const returnedInvoices = invoices.filter(
      (invoice) => invoice.status === "RETURNED",
    );

    const grossSales = paidInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.grossAmount),
      0,
    );
    const totalReturns = returnedInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.returnedAmount),
      0,
    );
    const totalVoids = voidInvoices.reduce(
      (sum, invoice) => sum + calculateVoidAmount(invoice),
      0,
    );
    const totalDiscounts = paidInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.discountAmount),
      0,
    );
    const cashSales = paidInvoices.reduce(
      (sum, invoice) => sum + calculateCashCollected(invoice),
      0,
    );
    const ePaymentSales = paidInvoices.reduce(
      (sum, invoice) =>
        sum +
        invoice.ePayments.reduce(
          (paymentTotal, payment) => paymentTotal + toNumber(payment.amount),
          0,
        ),
      0,
    );
    const openingFund = timestamps.reduce(
      (sum, timestamp) => sum + toNumber(timestamp.cashInDrawerAmount),
      0,
    );
    const drawerCash = timestamps.reduce(
      (sum, timestamp) => sum + toNumber(timestamp.cashOutDrawerAmount),
      0,
    );
    const withdrawalAmount = timestamps.reduce(
      (sum, timestamp) => sum + toNumber(timestamp.withdrawnDrawerAmount),
      0,
    );
    const expectedCash = openingFund + cashSales;

    const allPreviousPaidInvoices = await prisma.invoice.findMany({
      where: {
        posTerminal: {
          companyId,
          ...(terminalId ? { id: terminalId } : {}),
        },
        status: "PAID",
        createdAt: {
          lt: input.from,
        },
      },
      select: {
        totalAmount: true,
        discountAmount: true,
        returnedAmount: true,
      },
    });

    const previousAccumulatedSales = allPreviousPaidInvoices.reduce(
      (sum, invoice) =>
        sum +
        toNumber(invoice.totalAmount) -
        toNumber(invoice.discountAmount) -
        toNumber(invoice.returnedAmount),
      0,
    );

    const salesForTheDay = paidInvoices.reduce(
      (sum, invoice) =>
        sum +
        toNumber(invoice.totalAmount) -
        toNumber(invoice.discountAmount) -
        toNumber(invoice.returnedAmount),
      0,
    );

    const sortedInvoiceNumbers = invoices
      .map((invoice) => invoice.invoiceNumber)
      .sort((a, b) => a - b);
    const voidInvoiceNumbers = voidInvoices
      .map((invoice) => invoice.invoiceNumber)
      .sort((a, b) => a - b);
    const returnInvoiceNumbers = returnedInvoices
      .map((invoice) => invoice.invoiceNumber)
      .sort((a, b) => a - b);

    const terminalName =
      timestamps[0]?.posTerminal.posName ??
      (terminalId ? "Selected Terminal" : "All Terminals");
    const terminalInfo = timestamps[0]?.posTerminal ?? null;

    const discountBreakdown = paidInvoices.reduce(
      (acc, invoice) => {
        const key = (invoice.discountType ?? "").toUpperCase();
        const amount = toNumber(invoice.discountAmount);

        if (key === "SENIOR") {
          acc.seniorDiscount += amount;
          acc.seniorCount += 1;
        } else if (key === "PWD") {
          acc.pwdDiscount += amount;
          acc.pwdCount += 1;
        } else if (key) {
          acc.otherDiscount += amount;
          acc.otherCount += 1;
        }

        return acc;
      },
      {
        seniorDiscount: 0,
        seniorCount: 0,
        pwdDiscount: 0,
        pwdCount: 0,
        otherDiscount: 0,
        otherCount: 0,
      },
    );

    return {
      generatedAt: new Date(),
      range: createRange(input.from, input.to),
      terminalId,
      terminalName,
      businessName: terminalInfo?.registeredName ?? "N/A",
      operatorName: terminalInfo?.operatedBy ?? "N/A",
      addressLine: terminalInfo?.address ?? "N/A",
      vatRegTin: terminalInfo?.vatTinNumber ?? "N/A",
      minNumber: terminalInfo?.minNumber ?? "N/A",
      serialNumber: terminalInfo ? getTerminalSerialNumber(terminalInfo) : "N/A",
      isTrainMode: terminalInfo?.isTrainMode ?? false,
      isAcknowledgement: (terminalInfo?.vat ?? 0) <= 0,
      beginningSI: sortedInvoiceNumbers.length ? formatInvoiceNumber(sortedInvoiceNumbers[0]!) : "N/A",
      endingSI: sortedInvoiceNumbers.length ? formatInvoiceNumber(sortedInvoiceNumbers[sortedInvoiceNumbers.length - 1]!) : "N/A",
      beginningVoid: voidInvoiceNumbers.length ? formatInvoiceNumber(voidInvoiceNumbers[0]!) : "N/A",
      endingVoid: voidInvoiceNumbers.length ? formatInvoiceNumber(voidInvoiceNumbers[voidInvoiceNumbers.length - 1]!) : "N/A",
      beginningReturn: returnInvoiceNumbers.length ? formatInvoiceNumber(returnInvoiceNumbers[0]!) : "N/A",
      endingReturn: returnInvoiceNumbers.length ? formatInvoiceNumber(returnInvoiceNumbers[returnInvoiceNumbers.length - 1]!) : "N/A",
      invoiceCount: invoices.length,
      returnCount: returnedInvoices.length,
      grossSales,
      netSales: grossSales - totalReturns - totalVoids - totalDiscounts,
      totalReturns,
      totalVoids,
      totalDiscounts,
      cashSales,
      ePaymentSales,
      vatableSales: paidInvoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.vatSales),
        0,
      ),
      vatAmount: paidInvoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.vatAmount),
        0,
      ),
      vatExemptSales: paidInvoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.vatExempt),
        0,
      ),
      vatZeroSales: paidInvoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.vatZero),
        0,
      ),
      openingFund,
      drawerCash,
      withdrawalAmount,
      shortOver: drawerCash + withdrawalAmount - expectedCash - totalReturns,
      resetCounter: terminalInfo
        ? terminalInfo.isTrainMode
          ? terminalInfo.resetCounterTrainNo
          : terminalInfo.resetCounterNo
        : 0,
      zCounter: terminalInfo
        ? terminalInfo.isTrainMode
          ? terminalInfo.zCounterTrainNo
          : terminalInfo.zCounterNo
        : 0,
      previousAccumulatedSales,
      salesForTheDay,
      lessVatAdjustment: 0,
      vatOnReturn: 0,
      otherVatAdjustments: 0,
      paymentsReceived: cashSales + ePaymentSales,
      presentAccumulatedSales: previousAccumulatedSales + salesForTheDay,
      seniorDiscount: discountBreakdown.seniorDiscount,
      seniorCount: discountBreakdown.seniorCount,
      pwdDiscount: discountBreakdown.pwdDiscount,
      pwdCount: discountBreakdown.pwdCount,
      otherDiscount: discountBreakdown.otherDiscount,
      otherCount: discountBreakdown.otherCount,
      paymentBreakdown: buildPaymentBreakdown(paidInvoices),
    };
  },

  async getTransactionHistory(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<TransactionHistoryDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const where = {
      ...createInvoiceWhere(companyId, input.from, input.to, terminalId),
      status: {
        not: "PENDING" as const,
      },
    } satisfies Prisma.InvoiceWhereInput;
    const skip = (input.page - 1) * input.pageSize;

    const [totals, totalTransactions, invoices] = await Promise.all([
      prisma.invoice.aggregate({
        where,
        _sum: {
          totalAmount: true,
          discountAmount: true,
          returnedAmount: true,
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          cashier: {
            select: {
              fullName: true,
            },
          },
          posTerminal: {
            select: {
              posName: true,
            },
          },
          ePayments: {
            include: {
              saleType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc",
        },
        skip,
        take: input.pageSize,
      }),
    ]);

    const items: TransactionHistoryItemDto[] = invoices
      .map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        createdAt: invoice.createdAt,
        status: invoice.status,
        cashierName: invoice.cashier.fullName ?? "Unknown",
        terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
        customerName: invoice.customerName,
        totalAmount: toNumber(invoice.totalAmount),
        discountAmount: toNumber(invoice.discountAmount),
        returnedAmount: toNumber(invoice.returnedAmount),
        cashCollected: calculateCashCollected(invoice),
        ePaymentAmount: invoice.ePayments.reduce(
          (sum, payment) => sum + toNumber(payment.amount),
          0,
        ),
        paymentMethods: buildPaymentBreakdown([invoice]),
      }));

    return {
      range: createRange(input.from, input.to),
      items,
      pagination: createPagination(input.page, input.pageSize, totalTransactions),
      totalTransactions,
      grossSales: toNumber(totals._sum.totalAmount),
      totalDiscounts: toNumber(totals._sum.discountAmount),
      totalReturns: toNumber(totals._sum.returnedAmount),
      totalNetSales:
        toNumber(totals._sum.totalAmount) -
        toNumber(totals._sum.discountAmount) -
        toNumber(totals._sum.returnedAmount),
    };
  },

  async getAuditTrail(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<AuditTrailDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const mergeWindow = input.page * input.pageSize;
    const timestampWhere = {
      posTerminal: {
        companyId,
        ...(terminalId ? { id: terminalId } : {}),
      },
    } satisfies Prisma.TimestampWhereInput;

    const [auditLogCount, timestampInCount, timestampOutCount, auditLogs, timestampIns, timestampOuts] =
      await Promise.all([
        prisma.auditLog.count({
          where: {
            companyId,
            ...(terminalId ? { posTerminalId: terminalId } : {}),
            createdAt: {
              gte: input.from,
              lte: input.to,
            },
          },
        }),
        prisma.timestamp.count({
          where: {
            ...timestampWhere,
            timestampIn: {
              gte: input.from,
              lte: input.to,
            },
          },
        }),
        prisma.timestamp.count({
          where: {
            ...timestampWhere,
            timestampOut: {
              gte: input.from,
              lte: input.to,
            },
          },
        }),
        prisma.auditLog.findMany({
          where: {
            companyId,
            ...(terminalId ? { posTerminalId: terminalId } : {}),
          createdAt: {
            gte: input.from,
            lte: input.to,
          },
        },
        include: {
          actorProfile: {
            select: {
              fullName: true,
              role: true,
            },
          },
          posTerminal: {
            select: {
              posName: true,
            },
          },
          },
          orderBy: {
            createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc",
          },
          take: mergeWindow,
        }),
        prisma.timestamp.findMany({
          where: {
            ...timestampWhere,
            timestampIn: {
              gte: input.from,
              lte: input.to,
            },
          },
          include: {
            cashier: {
              select: {
                fullName: true,
                role: true,
              },
            },
            managerIn: {
              select: {
                fullName: true,
                role: true,
              },
            },
            posTerminal: {
              select: {
                posName: true,
              },
            },
          },
          orderBy: {
            timestampIn: isOldestFirst(input.sortOrder) ? "asc" : "desc",
          },
          take: mergeWindow,
        }),
        prisma.timestamp.findMany({
          where: {
            ...timestampWhere,
            timestampOut: {
              gte: input.from,
              lte: input.to,
            },
          },
          include: {
            cashier: {
              select: {
                fullName: true,
                role: true,
              },
            },
            managerIn: {
              select: {
                fullName: true,
                role: true,
              },
            },
            managerOut: {
              select: {
                fullName: true,
                role: true,
              },
            },
            posTerminal: {
              select: {
                posName: true,
              },
            },
          },
          orderBy: {
            timestampOut: isOldestFirst(input.sortOrder) ? "asc" : "desc",
          },
          take: mergeWindow,
        }),
      ]);

    const auditItems: AuditTrailItemDto[] = auditLogs.map((log) => ({
      occurredAt: log.createdAt,
      actorName: log.actorProfile.fullName ?? "Unknown",
      actorRole: log.actorProfile.role,
      terminalName: log.posTerminal?.posName ?? null,
      action: log.actionType,
      amount: log.amount === null ? null : toNumber(log.amount),
      referenceId: log.referenceId ?? null,
      changes: log.changes ?? null,
      source: "audit_log",
    }));

    auditItems.push(
      ...timestampIns.map((timestamp) => ({
        occurredAt: timestamp.timestampIn!,
        actorName: timestamp.managerIn?.fullName ?? timestamp.cashier.fullName ?? "Unknown",
        actorRole: timestamp.managerIn?.role ?? timestamp.cashier.role,
        terminalName: timestamp.posTerminal.posName ?? "Unnamed terminal",
        action:
          toNumber(timestamp.cashInDrawerAmount) > 0 ? "SET_CASH_IN_DRAWER" : "LOG_IN",
        amount: toNumber(timestamp.cashInDrawerAmount),
        referenceId: timestamp.id,
        changes: null,
        source: "timestamp" as const,
      })),
      ...timestampOuts.map((timestamp) => ({
        occurredAt: timestamp.timestampOut!,
        actorName:
          timestamp.managerOut?.fullName ??
          timestamp.managerIn?.fullName ??
          timestamp.cashier.fullName ??
          "Unknown",
        actorRole:
          timestamp.managerOut?.role ??
          timestamp.managerIn?.role ??
          timestamp.cashier.role,
        terminalName: timestamp.posTerminal.posName ?? "Unnamed terminal",
        action:
          toNumber(timestamp.cashOutDrawerAmount) > 0 ? "SET_CASH_OUT_DRAWER" : "LOG_OUT",
        amount: toNumber(timestamp.cashOutDrawerAmount),
        referenceId: timestamp.id,
        changes: null,
        source: "timestamp" as const,
      })),
    );

    const sortedItems = auditItems.sort((a, b) =>
      isOldestFirst(input.sortOrder)
        ? a.occurredAt.getTime() - b.occurredAt.getTime()
        : b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
    const startIndex = (input.page - 1) * input.pageSize;
    const totalItems = auditLogCount + timestampInCount + timestampOutCount;

    return {
      range: createRange(input.from, input.to),
      items: sortedItems.slice(startIndex, startIndex + input.pageSize),
      pagination: createPagination(input.page, input.pageSize, totalItems),
    };
  },

  async getSalesReport(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<SalesReportDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const where = createItemWhere(companyId, input.from, input.to, terminalId);
    const skip = (input.page - 1) * input.pageSize;

    const [totalItems, itemRows, totalsRows] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              createdAt: true,
              returnedAmount: true,
            },
          },
          product: {
            include: {
              category: {
                select: {
                  categoryName: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            invoice: {
              createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc",
            },
          },
          {
            createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc",
          },
        ],
        skip,
        take: input.pageSize,
      }),
      prisma.$queryRaw<
        Array<{
          total_cost: Prisma.Decimal | number | null;
          total_price: Prisma.Decimal | number | null;
          overall_total_cost: Prisma.Decimal | number | null;
          total_revenue: Prisma.Decimal | number | null;
          total_profit: Prisma.Decimal | number | null;
        }>
      >(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN item.status <> 'RETURNED' THEN product.cost ELSE 0 END), 0) AS total_cost,
          COALESCE(SUM(CASE WHEN item.status <> 'RETURNED' THEN item.price ELSE 0 END), 0) AS total_price,
          COALESCE(SUM(CASE WHEN item.status <> 'RETURNED' THEN item.qty * product.cost ELSE 0 END), 0) AS overall_total_cost,
          COALESCE(SUM(CASE WHEN item.status <> 'RETURNED' THEN item.subtotal ELSE 0 END), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN item.status <> 'RETURNED' THEN item.subtotal - (item.qty * product.cost) ELSE 0 END), 0) AS total_profit
        FROM public.item AS item
        INNER JOIN public.invoice AS invoice
          ON invoice.uuid_invoice = item.uuid_invoice
        INNER JOIN public.product AS product
          ON product.uuid_product = item.uuid_product
        INNER JOIN public.pos_terminal_info AS terminal
          ON terminal.uuid_pos_terminal = invoice.uuid_pos_terminal
        WHERE terminal.company_id = ${companyId}::uuid
          AND invoice.created_at >= ${input.from}
          AND invoice.created_at <= ${input.to}
          AND invoice.status NOT IN ('VOID', 'CANCELLED')
          AND item.status <> 'VOID'
          ${terminalId ? Prisma.sql`AND terminal.uuid_pos_terminal = ${terminalId}::uuid` : Prisma.empty}
      `),
    ]);

    const items: SalesReportItemDto[] = itemRows.map((item) => {
      const quantity = toNumber(item.qty);
      const cost = toNumber(item.product.cost);
      const price = toNumber(item.price);
      const totalCost = quantity * cost;
      const revenue = toNumber(item.subTotal);
      const returnAmount =
        item.status === "RETURNED" ? toNumber(item.invoice.returnedAmount) : 0;

      return {
        invoiceId: item.invoice.id,
        invoiceNumber: item.invoice.invoiceNumber,
        invoiceDate: item.invoice.createdAt,
        itemId: item.id,
        itemName: item.product.name,
        baseUnit: item.product.baseUnit,
        quantity,
        cost,
        price,
        itemGroup: item.product.category.categoryName ?? "",
        barcode: item.product.barcode,
        isReturned: item.status === "RETURNED",
        returnAmount,
        totalCost,
        revenue: revenue - returnAmount,
        profit: revenue - returnAmount - totalCost,
      };
    });
    const totals = totalsRows[0];

    return {
      range: createRange(input.from, input.to),
      items,
      pagination: createPagination(input.page, input.pageSize, totalItems),
      totals: {
        totalCost: toNumber(totals?.total_cost),
        totalPrice: toNumber(totals?.total_price),
        overallTotalCost: toNumber(totals?.overall_total_cost),
        totalRevenue: toNumber(totals?.total_revenue),
        totalProfit: toNumber(totals?.total_profit),
      },
    };
  },

  async getDailyTransactions(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<DailyTransactionsDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const invoices = await prisma.invoice.findMany({
      where: createInvoiceWhere(companyId, input.from, input.to, terminalId),
      select: {
        createdAt: true,
        grossAmount: true,
        totalAmount: true,
        discountAmount: true,
        returnedAmount: true,
        status: true,
        cashTendered: true,
        changeAmount: true,
        ePayments: {
          select: {
            amount: true,
          },
        },
        posTerminal: {
          select: {
            posName: true,
          },
        },
      },
      orderBy: {
        createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc",
      },
    });

    const map = new Map<string, DailyTransactionItemDto>();

    for (const invoice of invoices) {
      const businessDate = normalizeStartOfDay(invoice.createdAt);
      const terminalName = invoice.posTerminal.posName ?? "Unnamed terminal";
      const key = `${businessDate.toISOString()}-${terminalName}`;
      const current = map.get(key) ?? {
        businessDate,
        terminalName,
        invoiceCount: 0,
        grossSales: 0,
        totalDiscounts: 0,
        totalReturns: 0,
        totalVoids: 0,
        netSales: 0,
        cashSales: 0,
        ePaymentSales: 0,
      };

      current.invoiceCount += 1;
       current.grossSales += toNumber(invoice.totalAmount);
      current.totalDiscounts += toNumber(invoice.discountAmount);
      current.totalReturns += toNumber(invoice.returnedAmount);
      if (invoice.status === "PAID") {
        current.cashSales += calculateCashCollected(invoice);
        current.ePaymentSales += invoice.ePayments.reduce(
          (sum, payment) => sum + toNumber(payment.amount),
          0,
        );
      }

      if (isVoidInvoice(invoice)) {
        current.totalVoids += calculateVoidAmount(invoice);
      }

      current.netSales +=
        toNumber(invoice.totalAmount) -
        toNumber(invoice.discountAmount) -
        toNumber(invoice.returnedAmount);

      map.set(key, current);
    }

    const items = [...map.values()].sort((a, b) =>
      isOldestFirst(input.sortOrder)
        ? a.businessDate.getTime() - b.businessDate.getTime()
        : b.businessDate.getTime() - a.businessDate.getTime(),
    );
    const start = (input.page - 1) * input.pageSize;

    return {
      range: createRange(input.from, input.to),
      items: items.slice(start, start + input.pageSize),
      pagination: createPagination(input.page, input.pageSize, items.length),
    };
  },

  async getTransactionList(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<TransactionListDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const invoices = await prisma.invoice.findMany({
      where: createInvoiceWhere(companyId, input.from, input.to, terminalId),
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        customerName: true,
        discountType: true,
        discountPercent: true,
        grossAmount: true,
        subTotal: true,
        dueAmount: true,
        returnedAmount: true,
        discountAmount: true,
        totalAmount: true,
        vatSales: true,
        vatZero: true,
        vatExempt: true,
        vatAmount: true,
        isTrainMode: true,
        reason: true,
        cashier: {
          select: {
            fullName: true,
          },
        },
        voidedBy: {
          select: {
            fullName: true,
          },
        },
        posTerminal: {
          select: {
            posName: true,
          },
        },
      },
      orderBy: {
        createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc",
      },
    });

    const items: TransactionListItemDto[] = [];
    const totals = createTransactionListTotals();

    for (const invoice of invoices) {
      const grossSales = Math.round(toNumber(invoice.grossAmount) * 100) / 100;
      const returnedAmount = Math.round(toNumber(invoice.returnedAmount) * 100) / 100;
      const lessDiscount = Math.round(toNumber(invoice.discountAmount) * 100) / 100;
      const refundRatio = calculateRefundRatio(invoice.totalAmount, invoice.returnedAmount);
      const subTotal = Math.round(toNumber(invoice.subTotal) * 100) / 100;
      const amountDue = Math.round(toNumber(invoice.dueAmount) * 100) / 100;
      const netOfSales = Math.round((subTotal - lessDiscount - returnedAmount) * 100) / 100;
      const vatable = Math.round(toNumber(invoice.vatSales) * (1 - refundRatio) * 100) / 100;
      const exempt = Math.round(toNumber(invoice.vatExempt) * (1 - refundRatio) * 100) / 100;
      const vat = Math.round(toNumber(invoice.vatAmount) * (1 - refundRatio) * 100) / 100;

      const baseEntry: TransactionListItemDto = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        entryDate: invoice.createdAt,
        source: "BASE",
        status: invoice.status,
        terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
        cashierName: invoice.cashier.fullName ?? "Unknown",
        managerName: invoice.voidedBy?.fullName ?? null,
        customerName: invoice.customerName,
        discountType: invoice.discountType ?? null,
        discountPercent: invoice.discountPercent ?? null,
        subTotal,
        amountDue,
        grossSales,
        returns: 0,
        netOfReturns: Math.round((grossSales - returnedAmount) * 100) / 100,
        lessDiscount,
        netOfSales,
        vatable,
        zeroRated: Math.round(toNumber(invoice.vatZero) * 100) / 100,
        exempt,
        vat,
        returnedAmount,
        reason: invoice.reason ?? null,
        isTrainMode: invoice.isTrainMode,
      };

      items.push(baseEntry);
      updateTransactionListTotals(totals, {
        grossSales,
        returns: returnedAmount,
        lessDiscount,
        netOfSales,
        vatable,
        exempt,
        vat,
      });

      if (isVoidInvoice(invoice)) {
        const voidEntry: TransactionListItemDto = {
          ...baseEntry,
          entryDate: invoice.updatedAt,
          source: "VOIDED",
          grossSales: -grossSales,
          subTotal: -subTotal,
          amountDue: -amountDue,
          netOfReturns: -grossSales,
          lessDiscount: -lessDiscount,
          netOfSales: -netOfSales,
          vatable: -vatable,
          zeroRated: 0,
          exempt: -exempt,
          vat: -vat,
          returns: 0,
        };
        items.push(voidEntry);
        updateTransactionListTotals(totals, {
          grossSales: -grossSales,
          returns: 0,
          lessDiscount: -lessDiscount,
          netOfSales: -netOfSales,
          vatable: -vatable,
          exempt: -exempt,
          vat: -vat,
        });
      }

      if (invoice.status === "RETURNED" && returnedAmount > 0) {
        const returnVatable =
          grossSales > 0 ? Math.round((vatable * returnedAmount) / grossSales * 100) / 100 : 0;
        const returnExempt =
          grossSales > 0 ? Math.round((exempt * returnedAmount) / grossSales * 100) / 100 : 0;
        const returnVat =
          grossSales > 0 ? Math.round((vat * returnedAmount) / grossSales * 100) / 100 : 0;

        const refundEntry: TransactionListItemDto = {
          ...baseEntry,
          entryDate: invoice.updatedAt,
          source: "REFUNDED",
          grossSales: -returnedAmount,
          subTotal: -returnedAmount,
          amountDue: 0,
          returns: returnedAmount,
          netOfReturns: -returnedAmount,
          lessDiscount: 0,
          netOfSales: -returnedAmount,
          vatable: -returnVatable,
          zeroRated: 0,
          exempt: -returnExempt,
          vat: -returnVat,
        };
        items.push(refundEntry);
        updateTransactionListTotals(totals, {
          grossSales: -returnedAmount,
          returns: returnedAmount,
          lessDiscount: 0,
          netOfSales: -returnedAmount,
          vatable: -returnVatable,
          exempt: -returnExempt,
          vat: -returnVat,
        });
      }
    }

    const sorted = items.sort((a, b) => {
      if (a.invoiceNumber === b.invoiceNumber) {
        return isOldestFirst(input.sortOrder)
          ? a.entryDate.getTime() - b.entryDate.getTime()
          : b.entryDate.getTime() - a.entryDate.getTime();
      }

      return isOldestFirst(input.sortOrder)
        ? a.invoiceNumber - b.invoiceNumber
        : b.invoiceNumber - a.invoiceNumber;
    });
    const start = (input.page - 1) * input.pageSize;

    return {
      range: createRange(input.from, input.to),
      items: sorted.slice(start, start + input.pageSize),
      pagination: createPagination(input.page, input.pageSize, sorted.length),
      totals,
    };
  },

  async getVoidedList(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<VoidedListDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const where = {
      ...createInvoiceWhere(companyId, input.from, input.to, terminalId),
      OR: [{ status: "VOID" as const }, { status: "CANCELLED" as const }],
    } satisfies Prisma.InvoiceWhereInput;

    const [totalItems, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          cashier: { select: { fullName: true } },
          voidedBy: { select: { fullName: true } },
          posTerminal: { select: { posName: true } },
          items: {
            where: { status: "VOID" },
            include: {
              product: { select: { name: true, barcode: true } },
            },
          },
        },
        orderBy: { createdAt: isOldestFirst(input.sortOrder) ? "asc" : "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    const items: VoidedListItemDto[] = invoices.map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      transactionDate: invoice.createdAt,
      voidedDate: invoice.updatedAt,
      cashierName: invoice.cashier.fullName ?? "Unknown",
      cancelledBy: invoice.voidedBy?.fullName ?? null,
      terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
      discountType: invoice.discountType ?? null,
      grossSales: toNumber(invoice.grossAmount),
      discountAmount: toNumber(invoice.discountAmount),
      amountDue: toNumber(invoice.dueAmount),
      vatable: toNumber(invoice.vatSales),
      zeroRated: toNumber(invoice.vatZero),
      exempt: toNumber(invoice.vatExempt),
      vat: toNumber(invoice.vatAmount),
      reason: invoice.reason ?? null,
      items: invoice.items.map((item) => ({
        itemId: item.id,
        itemName: item.product.name,
        barcode: item.product.barcode,
        quantity: toNumber(item.qty),
        price: toNumber(item.price),
        amount: toNumber(item.subTotal),
      })),
    }));

    return {
      range: createRange(input.from, input.to),
      items,
      pagination: createPagination(input.page, input.pageSize, totalItems),
      totals: {
        totalGross: items.reduce((sum, item) => sum + item.grossSales, 0),
        totalDiscount: items.reduce((sum, item) => sum + item.discountAmount, 0),
        totalAmountDue: items.reduce((sum, item) => sum + item.amountDue, 0),
        totalVatable: items.reduce((sum, item) => sum + item.vatable, 0),
        totalVatZero: items.reduce((sum, item) => sum + item.zeroRated, 0),
        totalExempt: items.reduce((sum, item) => sum + item.exempt, 0),
        totalVat: items.reduce((sum, item) => sum + item.vat, 0),
      },
    };
  },

  async getDiscountReport(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput & { type: "PWD" | "SENIOR" },
  ): Promise<DiscountReportDto> {
    const transactionList = await reportService.getTransactionList(viewer, input);

    const filteredItems = transactionList.items.filter(
      (item) =>
        item.source === "BASE" &&
        (item.discountType ?? "").toUpperCase() === input.type,
    );
    const totals = createTransactionListTotals();

    for (const item of filteredItems) {
      updateTransactionListTotals(totals, {
        grossSales: item.grossSales,
        returns: item.returnedAmount,
        lessDiscount: item.lessDiscount,
        netOfSales: item.netOfSales,
        vatable: item.vatable,
        exempt: item.exempt,
        vat: item.vat,
      });
    }

    const start = (input.page - 1) * input.pageSize;

    return {
      range: transactionList.range,
      type: input.type,
      items: filteredItems.slice(start, start + input.pageSize),
      pagination: createPagination(input.page, input.pageSize, filteredItems.length),
      totals,
    };
  },

  async getSalesBook(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<SalesBookDto> {
    const dailyTransactions = await reportService.getDailyTransactions(viewer, input);
    const items: SalesBookItemDto[] = dailyTransactions.items.map((item) => ({
      businessDate: item.businessDate,
      terminalName: item.terminalName,
      invoiceCount: item.invoiceCount,
      grossSales: item.grossSales,
      totalDiscounts: item.totalDiscounts,
      totalReturns: item.totalReturns,
      totalVoids: item.totalVoids,
      netSales: item.netSales,
      vatableSales: item.netSales - item.totalDiscounts,
      vatAmount: (item.netSales - item.totalDiscounts) / 1.12 * 0.12,
    }));

    return {
      range: dailyTransactions.range,
      items,
      pagination: dailyTransactions.pagination,
      totals: {
        grossSales: items.reduce((sum, item) => sum + item.grossSales, 0),
        totalDiscounts: items.reduce((sum, item) => sum + item.totalDiscounts, 0),
        totalReturns: items.reduce((sum, item) => sum + item.totalReturns, 0),
        totalVoids: items.reduce((sum, item) => sum + item.totalVoids, 0),
        netSales: items.reduce((sum, item) => sum + item.netSales, 0),
        vatableSales: items.reduce((sum, item) => sum + item.vatableSales, 0),
        vatAmount: items.reduce((sum, item) => sum + item.vatAmount, 0),
      },
    };
  },

  async getRefundInvoices(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<RefundInvoicesDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const where = {
      ...createInvoiceWhere(companyId, input.from, input.to, terminalId),
      status: "RETURNED" as const,
    } satisfies Prisma.InvoiceWhereInput;

    const [totalItems, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          cashier: { select: { fullName: true } },
          voidedBy: { select: { fullName: true } },
          posTerminal: { select: { posName: true } },
          items: { select: { id: true, status: true } },
        },
        orderBy: { updatedAt: isOldestFirst(input.sortOrder) ? "asc" : "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    const items: RefundInvoiceItemDto[] = invoices.map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      transactionDate: invoice.createdAt,
      refundDate: invoice.updatedAt,
      cashierName: invoice.cashier.fullName ?? "Unknown",
      managerName: invoice.voidedBy?.fullName ?? null,
      terminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
      customerName: invoice.customerName,
      totalAmount: toNumber(invoice.totalAmount),
      returnedAmount: toNumber(invoice.returnedAmount),
      itemCount: invoice.items.length,
      refundRatio: calculateRefundRatio(invoice.totalAmount, invoice.returnedAmount),
      reason: invoice.reason ?? null,
      isFullRefund:
        Math.abs(toNumber(invoice.returnedAmount) - toNumber(invoice.totalAmount)) < 0.01,
      isTrainMode: invoice.isTrainMode,
    }));

    return {
      range: createRange(input.from, input.to),
      items,
      pagination: createPagination(input.page, input.pageSize, totalItems),
      totalRefundAmount: items.reduce((sum, item) => sum + item.returnedAmount, 0),
    };
  },

  async getReturnedItems(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<ReturnedItemsDto> {
    const { companyId, terminalId } = await resolveCompanyScope(viewer, input);
    const where = {
      status: "RETURNED" as const,
      invoice: createInvoiceWhere(companyId, input.from, input.to, terminalId),
    } satisfies Prisma.ItemWhereInput;

    const [totalItems, rows] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        include: {
          product: { select: { name: true, barcode: true } },
          invoice: {
            include: {
              cashier: { select: { fullName: true } },
              voidedBy: { select: { fullName: true } },
              posTerminal: { select: { posName: true } },
            },
          },
        },
        orderBy: { updatedAt: isOldestFirst(input.sortOrder) ? "asc" : "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    const items: ReturnedItemDto[] = rows.map((item) => {
      const returnRatio = calculateRefundRatio(
        item.invoice.totalAmount,
        item.invoice.returnedAmount,
      );
      const lineSubtotal = toNumber(item.subTotal);

      return {
        invoiceId: item.invoice.id,
        invoiceNumber: item.invoice.invoiceNumber,
        itemId: item.id,
        itemName: item.product.name,
        barcode: item.product.barcode,
        quantity: toNumber(item.qty),
        price: toNumber(item.price),
        lineSubtotal,
        returnAmount: Math.round(lineSubtotal * returnRatio * 100) / 100,
        transactionDate: item.invoice.createdAt,
        returnDate: item.updatedAt,
        terminalName: item.invoice.posTerminal.posName ?? "Unnamed terminal",
        cashierName: item.invoice.cashier.fullName ?? "Unknown",
        managerName: item.invoice.voidedBy?.fullName ?? null,
        isTrainMode: item.invoice.isTrainMode,
      };
    });

    return {
      range: createRange(input.from, input.to),
      items,
      pagination: createPagination(input.page, input.pageSize, totalItems),
      totalReturnAmount: items.reduce((sum, item) => sum + item.returnAmount, 0),
    };
  },

  async getReturnedInvoiceRecords(
    viewer: ReportViewerDto,
    input: ReportPagedRangeInput,
  ): Promise<ReturnedInvoiceRecordsDto> {
    const refunds = await reportService.getRefundInvoices(viewer, input);
    const items: ReturnedInvoiceRecordItemDto[] = refunds.items.map((invoice) => ({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      transactionDate: invoice.transactionDate,
      recordDate: invoice.refundDate,
      terminalName: invoice.terminalName,
      cashierName: invoice.cashierName,
      managerName: invoice.managerName,
      customerName: invoice.customerName,
      totalAmount: invoice.totalAmount,
      returnedAmount: invoice.returnedAmount,
      itemCount: invoice.itemCount,
      reason: invoice.reason,
      recordType: invoice.isFullRefund ? "FULL_RETURN" : "PARTIAL_RETURN",
    }));

    return {
      range: refunds.range,
      items,
      pagination: refunds.pagination,
      totalReturnedAmount: refunds.totalRefundAmount,
    };
  },

  async getInvoicePrintPayload(
    viewer: ReportViewerDto,
    invoiceId: string,
  ): Promise<ReportInvoicePrintPayloadDto> {
    if (viewer.role !== "admin" && !viewer.companyId) {
      throw new Error("No company selected for reports.");
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(viewer.role === "admin"
          ? {}
          : {
              posTerminal: {
                companyId: viewer.companyId!,
              },
            }),
      },
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

    if (!invoice) {
      throw new Error("Invoice not found for report printing.");
    }

    const receiptPayload = receiptPrintService.buildPayload({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt.toISOString(),
      posTerminalName: invoice.posTerminal.posName ?? "Unnamed terminal",
      printerName: invoice.posTerminal.printerName || null,
      printerConfig: printConfigService.mapPrinterConfig(invoice.posTerminal),
      registeredName: invoice.posTerminal.registeredName,
      address: invoice.posTerminal.address,
      vatTinNumber: invoice.posTerminal.vatTinNumber,
      minNumber: invoice.posTerminal.minNumber,
      terminalVat: invoice.posTerminal.vat ?? 0,
      cashierName: invoice.cashier.fullName ?? "Unknown",
      isTrainMode: invoice.isTrainMode,
      discountType: invoice.discountType ?? null,
      discountAmount: toNumber(invoice.discountAmount),
      dueAmount: toNumber(invoice.dueAmount),
      totalTendered: toNumber(invoice.totalTendered),
      eligibleDiscName: invoice.eligibleDiscName ?? null,
      customerName: invoice.customerName,
      totalAmount: toNumber(invoice.totalAmount),
      cashTendered: toNumber(invoice.cashTendered),
      changeAmount: toNumber(invoice.changeAmount),
      vatSales: toNumber(invoice.vatSales),
      vatExempt: toNumber(invoice.vatExempt),
      vatZero: toNumber(invoice.vatZero),
      vatAmount: toNumber(invoice.vatAmount),
      otherPayments: invoice.ePayments.map((payment) => ({
        name: getPaymentMethodName(payment.saleType.name),
        amount: toNumber(payment.amount),
        reference: payment.reference,
      })),
      items: invoice.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        qty: toNumber(item.qty),
        subTotal: toNumber(item.subTotal),
        status: item.status,
      })),
      stockUpdates: [],
    });

    const archivedDocument = await printArchiveService.getLatestInvoiceArchive(invoice.id);

    if (archivedDocument) {
      const reprintDocument = await printArchiveService.createReprint(
        archivedDocument.id,
        archivedDocument.type,
      );

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        printerAvailable: receiptPayload.printerAvailable,
        printerName: receiptPayload.printerName,
        printerConfig: receiptPayload.printerConfig,
        message: receiptPayload.message,
        previewContent: reprintDocument.content,
        printSegments: [reprintDocument.content],
        archiveContent: archivedDocument.content,
        archiveDocumentId: archivedDocument.id,
        isTrainMode: archivedDocument.isTrainMode,
      };
    }

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      printerAvailable: receiptPayload.printerAvailable,
      printerName: receiptPayload.printerName,
      printerConfig: receiptPayload.printerConfig,
      message: receiptPayload.message,
      previewContent: receiptPayload.previewContent,
      printSegments: receiptPayload.printSegments,
      archiveContent: receiptPayload.archiveContent,
      archiveDocumentId: null,
      isTrainMode: invoice.isTrainMode,
    };
  },

  async getXReadingByTimestampId(timestampId: string): Promise<XReadingDto> {
    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
      include: {
        cashier: {
          select: {
            fullName: true,
          },
        },
        posTerminal: {
          select: {
            companyId: true,
            id: true,
            posName: true,
            registeredName: true,
            operatedBy: true,
            address: true,
            vatTinNumber: true,
            minNumber: true,
            ptuNumber: true,
            accreditationNumber: true,
            isTrainMode: true,
            vat: true,
          },
        },
      },
    });

    if (!timestamp) {
      throw new Error("Session not found for X-reading.");
    }

    return buildXReadingFromTimestamp(timestamp, timestamp.posTerminal.companyId);
  },

  normalizeStartOfDay,
  normalizeEndOfDay,
};
