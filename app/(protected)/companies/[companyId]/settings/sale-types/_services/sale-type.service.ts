import "server-only";

import { prisma } from "@/lib/prisma";
import type { SaleTypeFormInput, SaleTypeListItemDTO } from "./sale-type.dto";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

async function ensureUniqueName(name: string, excludeId?: string) {
  const saleTypes = await prisma.saleType.findMany({
    where: {
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
  async listReferencePaymentMethods(): Promise<SaleTypeListItemDTO[]> {
    const saleTypes = await prisma.saleType.findMany({
      where: {
        type: "EPAYMENT",
      },
      select: {
        id: true,
        name: true,
        account: true,
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
      paymentCount: saleType._count.ePayments,
    }));
  },

  async createReferencePaymentMethod(input: SaleTypeFormInput) {
    await ensureUniqueName(input.name);

    return prisma.saleType.create({
      data: {
        name: input.name,
        account: input.account || null,
        type: "EPAYMENT",
      },
      select: {
        id: true,
        name: true,
        account: true,
        _count: {
          select: {
            ePayments: true,
          },
        },
      },
    });
  },

  async updateReferencePaymentMethod(id: string, input: SaleTypeFormInput) {
    await ensureUniqueName(input.name, id);

    return prisma.saleType.update({
      where: { id },
      data: {
        name: input.name,
        account: input.account || null,
      },
      select: {
        id: true,
        name: true,
        account: true,
        _count: {
          select: {
            ePayments: true,
          },
        },
      },
    });
  },

  async deleteReferencePaymentMethod(id: string) {
    const saleType = await prisma.saleType.findUnique({
      where: { id },
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
