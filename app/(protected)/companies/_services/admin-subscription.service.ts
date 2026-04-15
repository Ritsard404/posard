import { prisma } from "@/lib/prisma";
import type { PageResult } from "./_dto/common.dto";
import type { AdminSubscriptionListItemDto, AdminSubscriptionListQuery } from "./_dto/admin-subscription.dto";
import { mapAdminSubscriptionListItem } from "./_mappers/admin-subscription.mapper";

export const adminSubscriptionService = {
  async getSubscriptionsPage(
    query: AdminSubscriptionListQuery,
  ): Promise<PageResult<AdminSubscriptionListItemDto>> {
    const skip = query.page * query.size;

    const terminals = await prisma.posTerminalInfo.findMany({
      where: {
        ...(query.companyId ? { companyId: query.companyId } : {}),
        ...(query.keyword
          ? {
              OR: [
                { posName: { contains: query.keyword, mode: "insensitive" as const } },
                { company: { is: { name: { contains: query.keyword, mode: "insensitive" as const } } } },
              ],
            }
          : {}),
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        subscription: true,
      },
      orderBy: [{ createdAt: "desc" }, { posName: "asc" }],
    });

    const mapped = terminals.map(mapAdminSubscriptionListItem).filter((item) => {
      if (query.status && item.status !== query.status) {
        return false;
      }

      if (query.billingCycle && item.billingCycle !== query.billingCycle) {
        return false;
      }

      return true;
    });

    return {
      items: mapped.slice(skip, skip + query.size),
      totalCount: mapped.length,
      page: query.page,
      size: query.size,
      totalPages: Math.max(1, Math.ceil(mapped.length / query.size)),
    };
  },
};
