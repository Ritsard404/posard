import { prisma } from "@/lib/prisma";
import { type CompanyDTO, type UpdateCompanyInput } from "./company.dto";

export const companyService = {
  async getCompanies(): Promise<CompanyDTO[]> {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      email: c.email,
      phone: c.phone,
      logoImageUrl: c.logoImageUrl,
      isApproved: c.isApproved,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },

  async getCompanyById(id: string): Promise<CompanyDTO | null> {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) return null;

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
