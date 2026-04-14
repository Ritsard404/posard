import { prisma } from "@/lib/prisma";
import {
  type CompanyDetailDTO,
  type CompanyListItemDTO,
  type CompanyDTO,
  type UpdateCompanyInput,
} from "./company.dto";
import { withOptionalCompanyTable } from "./company-schema-guard.service";

function mapCompanyBase(company: {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  logoImageUrl: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CompanyDTO {
  return {
    id: company.id,
    name: company.name,
    code: company.code,
    email: company.email,
    phone: company.phone,
    logoImageUrl: company.logoImageUrl,
    isApproved: company.isApproved,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export const companyService = {
  async getCompanies(): Promise<CompanyListItemDTO[]> {
    const companies = await withOptionalCompanyTable(
      () =>
        prisma.company.findMany({
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true,
            logoImageUrl: true,
            isApproved: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                posTerminals: true,
                terminalRequests: {
                  where: {
                    status: "pending",
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        }),
      await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          logoImageUrl: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posTerminals: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }).then((items) =>
        items.map((item) => ({
          ...item,
          _count: {
            posTerminals: item._count.posTerminals,
            terminalRequests: 0,
          },
        })),
      ),
      "public.terminal_request",
    );

    return companies.map((c) => ({
      ...mapCompanyBase(c),
      terminalCount: c._count.posTerminals,
      pendingTerminalRequestCount: c._count.terminalRequests,
    }));
  },

  async getCompanyById(id: string): Promise<CompanyDetailDTO | null> {
    const company = await withOptionalCompanyTable(
      () =>
        prisma.company.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true,
            logoImageUrl: true,
            isApproved: true,
            createdAt: true,
            updatedAt: true,
            posTerminals: {
              select: {
                id: true,
                isActive: true,
                subscription: {
                  select: {
                    status: true,
                  },
                },
              },
            },
            terminalRequests: {
              select: {
                status: true,
              },
            },
          },
        }),
      await prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          logoImageUrl: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
          posTerminals: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      }).then((item) =>
        item
          ? {
              ...item,
              posTerminals: item.posTerminals.map((terminal) => ({
                ...terminal,
                subscription: null,
              })),
              terminalRequests: [],
            }
          : null,
      ),
      ["public.terminal_request", "public.terminal_subscription"],
    );

    if (!company) return null;

    const terminalCount = company.posTerminals.length;
    const activeTerminalCount = company.posTerminals.filter((terminal) => terminal.isActive).length;
    const activeSubscriptionCount = company.posTerminals.filter(
      (terminal) => terminal.subscription?.status === "active",
    ).length;
    const pendingTerminalRequestCount = company.terminalRequests.filter(
      (request) => request.status === "pending",
    ).length;

    return {
      ...mapCompanyBase(company),
      terminalCount,
      activeTerminalCount,
      activeSubscriptionCount,
      pendingTerminalRequestCount,
    };
  },

  async updateCompany(
    id: string,
    payload: UpdateCompanyInput,
  ): Promise<CompanyDTO> {
    const updated = await prisma.company.update({
      where: { id },
      data: payload,
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      email: updated.email,
      phone: updated.phone,
      logoImageUrl: updated.logoImageUrl,
      isApproved: updated.isApproved,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },
};
