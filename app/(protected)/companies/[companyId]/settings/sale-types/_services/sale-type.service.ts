import "server-only";

import { prisma } from "@/lib/prisma";
import type { SaleTypeFormInput, SaleTypeListItemDTO } from "./sale-type.dto";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

async function ensureUniqueName(companyId: string, name: string, excludeId?: string) {
  const saleTypes = await prisma.saleType.findMany({
    where: {
      companyId,
      type: "EPAYMENT",
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: {
      id: true,
      name: true,
    },
  });

  const duplicate = saleTypes.find(
    (item) => normalizeName(item.name ?? "") === normalizeName(name),
  );

  if (duplicate) {
    throw new Error("A payment method with that name already exists");
  }
}

export const saleTypeService = {
  async listReferencePaymentMethods(companyId: string): Promise<SaleTypeListItemDTO[]> {
    const saleTypes = await prisma.saleType.findMany({
      where: {
        companyId,
        type: "EPAYMENT",
      },
      select: {
        id: true,
        name: true,
        account: true,
        paymentQrImageUrl: true,
        paymentAccountHolder: true,
        paymentAccountNumber: true,
        paymentProviderName: true,
        paymentInstructions: true,
        paymentDisplayEnabled: true,
        paymentDisplayOrder: true,
        paymentDetailsUpdatedAt: true,
        _count: {
          select: {
            ePayments: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return saleTypes.map((saleType) => ({
      id: saleType.id,
      name: saleType.name?.trim() || "Unlabeled payment method",
      account: saleType.account?.trim() || null,
      paymentQrImageUrl: saleType.paymentQrImageUrl?.trim() || null,
      paymentAccountHolder: saleType.paymentAccountHolder?.trim() || null,
      paymentAccountNumber: saleType.paymentAccountNumber?.trim() || null,
      paymentProviderName: saleType.paymentProviderName?.trim() || null,
      paymentInstructions: saleType.paymentInstructions?.trim() || null,
      paymentDisplayEnabled: saleType.paymentDisplayEnabled,
      paymentDisplayOrder: saleType.paymentDisplayOrder,
      paymentDetailsUpdatedAt: saleType.paymentDetailsUpdatedAt?.toISOString() ?? null,
      paymentCount: saleType._count.ePayments,
    }));
  },

  async createReferencePaymentMethod(companyId: string, input: SaleTypeFormInput) {
    await ensureUniqueName(companyId, input.name);

    return prisma.saleType.create({
      data: {
        companyId,
        name: input.name,
        account: input.account || null,
        type: "EPAYMENT",
        paymentQrImageUrl: input.paymentQrImageUrl || null,
        paymentAccountHolder: input.paymentAccountHolder || null,
        paymentAccountNumber: input.paymentAccountNumber || null,
        paymentProviderName: input.paymentProviderName || null,
        paymentInstructions: input.paymentInstructions || null,
        paymentDisplayEnabled: input.paymentDisplayEnabled,
        paymentDisplayOrder: input.paymentDisplayOrder,
        paymentDetailsUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        account: true,
        paymentQrImageUrl: true,
        paymentAccountHolder: true,
        paymentAccountNumber: true,
        paymentProviderName: true,
        paymentInstructions: true,
        paymentDisplayEnabled: true,
        paymentDisplayOrder: true,
        paymentDetailsUpdatedAt: true,
        _count: {
          select: {
            ePayments: true,
          },
        },
      },
    });
  },

  async updateReferencePaymentMethod(companyId: string, id: string, input: SaleTypeFormInput) {
    await ensureUniqueName(companyId, input.name, id);
    const existing = await prisma.saleType.findFirst({
      where: { id, companyId, type: "EPAYMENT" },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Payment method not found");
    }

    return prisma.saleType.update({
      where: { id },
      data: {
        name: input.name,
        account: input.account || null,
        paymentQrImageUrl: input.paymentQrImageUrl || null,
        paymentAccountHolder: input.paymentAccountHolder || null,
        paymentAccountNumber: input.paymentAccountNumber || null,
        paymentProviderName: input.paymentProviderName || null,
        paymentInstructions: input.paymentInstructions || null,
        paymentDisplayEnabled: input.paymentDisplayEnabled,
        paymentDisplayOrder: input.paymentDisplayOrder,
        paymentDetailsUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        account: true,
        paymentQrImageUrl: true,
        paymentAccountHolder: true,
        paymentAccountNumber: true,
        paymentProviderName: true,
        paymentInstructions: true,
        paymentDisplayEnabled: true,
        paymentDisplayOrder: true,
        paymentDetailsUpdatedAt: true,
        _count: {
          select: {
            ePayments: true,
          },
        },
      },
    });
  },

  async deleteReferencePaymentMethod(companyId: string, id: string) {
    const saleType = await prisma.saleType.findFirst({
      where: { id, companyId, type: "EPAYMENT" },
      select: {
        _count: {
          select: {
            ePayments: true,
          },
        },
      },
    });

    if (!saleType) {
      throw new Error("Payment method not found");
    }

    if (saleType._count.ePayments > 0) {
      throw new Error("This payment method is already used in transactions and cannot be deleted");
    }

    await prisma.saleType.delete({
      where: { id },
    });
  },
};
