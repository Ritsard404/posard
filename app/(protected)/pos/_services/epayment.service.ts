import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EPaymentMethodDto } from "./_dto/pos.dto";

const DEFAULT_REFERENCE_PAYMENT_METHODS = [
  "GCash",
  "Maya",
  "Card",
  "Bank Transfer",
] as const;

function normalizePaymentMethodName(name: string | null) {
  return name?.trim().toLowerCase() ?? "";
}

export const epaymentService = {
  async getEPaymentMethods(
    companyId: string,
    options: { changedSince?: Date } = {},
  ): Promise<EPaymentMethodDto[]> {
    const existingTypes = await prisma.saleType.findMany({
      where: {
        companyId,
        type: "EPAYMENT",
      },
      select: {
        name: true,
      },
    });
    const existingNames = new Set(
      existingTypes.map((type) => normalizePaymentMethodName(type.name)),
    );
    const missingDefaults = DEFAULT_REFERENCE_PAYMENT_METHODS.filter(
      (name) => !existingNames.has(normalizePaymentMethodName(name)),
    );

    if (missingDefaults.length > 0) {
      try {
        await prisma.saleType.createMany({
          data: missingDefaults.map((name) => ({
            companyId,
            name,
            account: null,
            type: "EPAYMENT" as const,
          })),
          skipDuplicates: true,
        });
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          )
        ) {
          throw error;
        }
      }
    }

    const types = await prisma.saleType.findMany({
      where: {
        companyId,
        type: "EPAYMENT",
        ...(options.changedSince ? { updatedAt: { gt: options.changedSince } } : {}),
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
      },
      orderBy: [
        { paymentDisplayOrder: "asc" },
        { name: "asc" },
      ],
    });

    return types.map((t) => ({
      id: t.id,
      name: t.name,
      account: t.account,
      paymentQrImageUrl: t.paymentQrImageUrl,
      paymentAccountHolder: t.paymentAccountHolder,
      paymentAccountNumber: t.paymentAccountNumber,
      paymentProviderName: t.paymentProviderName,
      paymentInstructions: t.paymentInstructions,
      paymentDisplayEnabled: t.paymentDisplayEnabled,
      paymentDisplayOrder: t.paymentDisplayOrder,
      paymentDetailsUpdatedAt: t.paymentDetailsUpdatedAt?.toISOString() ?? null,
    }));
  }
};
