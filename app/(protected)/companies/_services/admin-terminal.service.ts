import { prisma } from "@/lib/prisma";
import type { PageResult } from "./_dto/common.dto";
import type { AdminTerminalListItemDto, AdminTerminalListQuery } from "./_dto/admin-terminal.dto";
import { mapAdminTerminalListItem } from "./_mappers/admin-terminal.mapper";

export const adminTerminalService = {
  async getTerminalsPage(
    query: AdminTerminalListQuery,
  ): Promise<PageResult<AdminTerminalListItemDto>> {
    const skip = query.page * query.size;

    const terminals = await prisma.posTerminalInfo.findMany({
      where: {
        ...(query.companyId ? { companyId: query.companyId } : {}),
        ...(query.keyword
          ? {
              OR: [
                { posName: { contains: query.keyword, mode: "insensitive" as const } },
                { registeredName: { contains: query.keyword, mode: "insensitive" as const } },
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
        subscription: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
        sessions: {
          where: {
            isActive: true,
          },
          take: 1,
          orderBy: {
            loginTime: "desc",
          },
          select: {
            profile: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { posName: "asc" }],
    });

    const mapped = terminals.map(mapAdminTerminalListItem);
    const filtered = query.status
      ? mapped.filter((terminal) => terminal.approvalStatus === query.status)
      : mapped;

    return {
      items: filtered.slice(skip, skip + query.size),
      totalCount: filtered.length,
      page: query.page,
      size: query.size,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.size)),
    };
  },
};

