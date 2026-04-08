import "server-only";
import { prisma } from "@/lib/prisma";
import { EPaymentMethodDto } from "./_dto/pos.dto";

export const epaymentService = {
  async getEPaymentMethods(): Promise<EPaymentMethodDto[]> {
    const types = await prisma.saleType.findMany({
      where: {
        type: "EPAYMENT",
      },
      select: {
        id: true,
        name: true,
        account: true,
      },
      orderBy: {
        name: "asc"
      }
    });

    return types.map(t => ({
      id: t.id,
      name: t.name,
      account: t.account,
    }));
  }
};
