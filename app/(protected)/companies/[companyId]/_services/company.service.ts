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
  address: string | null;
  logoImageUrl: string | null;
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
            address: true,
            logoImageUrl: true,
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
          address: true,
          logoImageUrl: true,
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
    const baseCompany = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        address: true,
        logoImageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!baseCompany) return null;

    const terminalSnapshot = await withOptionalCompanyTable(
      () =>
        prisma.posTerminalInfo.findMany({
          where: { companyId: id },
          select: {
            id: true,
            isActive: true,
            subscription: {
              select: {
                status: true,
              },
            },
          },
        }),
      await prisma.posTerminalInfo.findMany({
        where: { companyId: id },
        select: {
          id: true,
          isActive: true,
        },
      }).then((items) =>
        items.map((terminal) => ({
          ...terminal,
          subscription: null,
        })),
      ),
      "public.terminal_subscription",
    );

    const requestSnapshot = await withOptionalCompanyTable(
      () =>
        prisma.terminalRequest.findMany({
          where: { companyId: id },
          select: {
            status: true,
          },
        }),
      [],
      "public.terminal_request",
    );

    const terminalCount = terminalSnapshot.length;
    const activeTerminalCount = terminalSnapshot.filter((terminal) => terminal.isActive).length;
    const activeSubscriptionCount = terminalSnapshot.filter(
      (terminal) => terminal.subscription?.status === "active",
    ).length;
    const pendingTerminalRequestCount = requestSnapshot.filter(
      (request) => request.status === "pending",
    ).length;

    return {
      ...mapCompanyBase(baseCompany),
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
    const updated = await prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id },
        data: payload,
      });

      if (payload.name !== undefined || payload.address !== undefined) {
        await tx.posTerminalInfo.updateMany({
          where: { companyId: id },
          data: {
            registeredName: company.name,
            address: company.address,
          },
        });
      }

      return company;
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      logoImageUrl: updated.logoImageUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },
};
