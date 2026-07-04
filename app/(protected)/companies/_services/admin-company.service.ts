import { prisma } from "@/lib/prisma";
import type { PageResult } from "./_dto/common.dto";
import {
  type CompanyAdminListQuery,
  type AdminCompanyUpsertInput,
  type AdminCompanyListItemDto,
} from "./_dto/admin-company.dto";
import { mapAdminCompanyListItem } from "./_mappers/admin-company.mapper";
import type { CompanyDTO } from "../[companyId]/_services/company.dto";

function toCompanyDto(company: {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoImageUrl: string | null;
  businessTypePreset: CompanyDTO["businessTypePreset"];
  createdAt: Date;
  updatedAt: Date;
}): CompanyDTO {
  return {
    id: company.id,
    name: company.name,
    code: company.code,
    email: company.email,
    phone: company.phone,
    address: company.address,
    logoImageUrl: company.logoImageUrl,
    businessTypePreset: company.businessTypePreset,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

function buildCompanyWhere(query: CompanyAdminListQuery) {
  return {
    ...(query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: "insensitive" as const } },
            { email: { contains: query.keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export const adminCompanyService = {
  async getCompaniesPage(
    query: CompanyAdminListQuery,
  ): Promise<PageResult<AdminCompanyListItemDto>> {
    const where = buildCompanyWhere(query);
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
          code: true,
          phone: true,
          address: true,
          logoImageUrl: true,
          businessTypePreset: true,
          createdAt: true,
          users: {
            where: {
              role: "manager",
              status: "active",
            },
            select: {
              fullName: true,
              email: true,
            },
            orderBy: [{ approvedAt: "asc" }, { createdAt: "asc" }],
            take: 1,
          },
          posTerminals: {
            select: {
              isActive: true,
              subscription: {
                select: {
                  status: true,
                },
              },
            },
          },
          terminalRequests: {
            where: {
              status: "pending",
            },
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    return {
      items: companies.map(mapAdminCompanyListItem),
      totalCount,
      page: query.page,
      size: query.size,
      totalPages: Math.max(1, Math.ceil(totalCount / query.size)),
    };
  },

  async getCompanyOptions(): Promise<Array<{ id: string; name: string }>> {
    return prisma.company.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
  },

  async getCompanyById(companyId: string): Promise<CompanyDTO | null> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        address: true,
        logoImageUrl: true,
        businessTypePreset: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return company ? toCompanyDto(company) : null;
  },

  async createCompany(payload: AdminCompanyUpsertInput): Promise<CompanyDTO> {
    const company = await prisma.company.create({
      data: payload,
    });

    return toCompanyDto(company);
  },

  async updateCompany(companyId: string, payload: AdminCompanyUpsertInput): Promise<CompanyDTO> {
    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: payload,
      });

      if (payload.name !== undefined || payload.address !== undefined) {
        await tx.posTerminalInfo.updateMany({
          where: { companyId },
          data: {
            registeredName: updated.name,
            address: updated.address,
          },
        });
      }

      return updated;
    });

    return toCompanyDto(company);
  },

  async deleteCompany(companyId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          posTerminals: {
            select: {
              id: true,
              isActive: true,
              sessions: {
                where: {
                  isActive: true,
                },
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (!company) {
        throw new Error("Company not found");
      }

      const hasActiveTerminal = company.posTerminals.some((terminal) => terminal.isActive);
      if (hasActiveTerminal) {
        throw new Error("Cannot delete a company with active terminals");
      }

      const hasTerminalInUse = company.posTerminals.some((terminal) => terminal.sessions.length > 0);
      if (hasTerminalInUse) {
        throw new Error("Cannot delete a company with terminals currently in use");
      }

      await tx.company.delete({
        where: { id: companyId },
      });
    });
  },
};
