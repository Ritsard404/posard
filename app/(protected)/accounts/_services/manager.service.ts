import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  AdminInfoDto,
  CashierInfoDto,
  CompanyDto,
  MyCashiersDto,
  PageResult,
  RegisterCashierDto,
  UpdateCompanyDto,
} from "./profile.dto";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ── Mock stores ───────────────────────────────────────────────────────────────

let mockAdmin: AdminInfoDto = {
  profileId: "profile-1",
  fullName: "John Doe",
  email: "admin@techcorp.com",
  company: {
    id: "c1",
    name: "Tech Corp",
    code: "COMP01",
    email: "admin@techcorp.com",
    phone: "555-0100",
    logoImageUrl: null,
  },
};

let mockCompany: CompanyDto = {
  id: "c1",
  name: "Tech Corp",
  code: "COMP01",
  email: "admin@techcorp.com",
  phone: "555-0100",
  logoImageUrl: null,
};

let mockCashiers: MyCashiersDto[] = [];

// ── Prisma sort whitelist ─────────────────────────────────────────────────────

const SORTABLE_FIELDS: Record<string, keyof Prisma.ProfileOrderByWithRelationInput> = {
  email: "email",
  fullName: "fullName",
  status: "status",
  createdAt: "createdAt",
};

// ── Service ───────────────────────────────────────────────────────────────────

export const adminService = {
  // ── Admin Profile ──────────────────────────────────────────────────────────

  async adminProfile(profileId: string): Promise<AdminInfoDto> {
    if (USE_MOCK) {
      await delay();
      return { ...mockAdmin };
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { company: true },
    });
    if (!profile) throw new Error("Admin not found");

    return {
      profileId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      company: profile.company
        ? {
            id: profile.company.id,
            name: profile.company.name,
            code: profile.company.code,
            email: profile.company.email,
            phone: profile.company.phone,
            logoImageUrl: profile.company.logoImageUrl,
          }
        : { id: null, name: null, code: null, email: null, phone: null, logoImageUrl: null },
    };
  },

  async updateAdminProfile(dto: AdminInfoDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockAdmin = { ...mockAdmin, ...dto };
      return;
    }

    await prisma.profile.update({
      where: { id: dto.profileId },
      data: { fullName: dto.fullName },
    });
  },

  // ── My Cashiers ────────────────────────────────────────────────────────────

  async myCashiers(
    adminId: string,
    params?: {
      keyword?: string;
      page?: number;
      size?: number;
      sortBy?: string;
      direction?: "asc" | "desc";
    },
  ): Promise<PageResult<MyCashiersDto>> {
    if (USE_MOCK) {
      await delay();
      const kw = params?.keyword?.toLowerCase() ?? "";
      const filtered = mockCashiers.filter(
        (c) => !kw || c.email.toLowerCase().includes(kw),
      );
      const page = params?.page ?? 0;
      const size = params?.size ?? 10;
      return {
        content: filtered.slice(page * size, page * size + size),
        total: filtered.length,
        page,
        size,
        totalPages: Math.ceil(filtered.length / size),
      };
    }

    const admin = await prisma.profile.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });
    if (!admin?.companyId)
      return { content: [], total: 0, page: 0, size: 10, totalPages: 0 };

    const orderByKey =
      params?.sortBy && SORTABLE_FIELDS[params.sortBy]
        ? params.sortBy
        : "createdAt";

    const where: Prisma.ProfileWhereInput = {
      companyId: admin.companyId,
      role: "cashier",
      ...(params?.keyword
        ? {
            OR: [
              { email: { contains: params.keyword, mode: "insensitive" } },
              { fullName: { contains: params.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const page = params?.page ?? 0;
    const size = params?.size ?? 10;

    const [total, profiles] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        select: { id: true, email: true, status: true },
        skip: page * size,
        take: size,
        orderBy: { [orderByKey]: params?.direction ?? "desc" },
      }),
    ]);

    return {
      content: profiles.map((p) => ({
        profileId: p.id,
        email: p.email,
        status: p.status,
        isActive: p.status === "active",
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  async registerCashier(dto: RegisterCashierDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockCashiers = [
        ...mockCashiers,
        {
          profileId: `p${Date.now()}`,
          email: dto.email,
          status: "pending",
          isActive: false,
        },
      ];
      return;
    }

    // Profile creation is tied to auth (Supabase). Use the auth invite flow
    // to create the user; their profile is created on first sign-in.
    throw new Error("Cashier registration must go through the auth invite flow");
  },

  // ── Cashier Info ───────────────────────────────────────────────────────────

  async cashierInfo(cashierId: string): Promise<CashierInfoDto | null> {
    if (USE_MOCK) {
      await delay();
      const cashier = mockCashiers.find((c) => c.profileId === cashierId);
      if (!cashier) return null;
      return {
        profileId: cashier.profileId,
        fullName: null,
        email: cashier.email,
        status: cashier.status,
        isActive: cashier.isActive,
        company: { id: null, name: null, code: null, email: null, phone: null, logoImageUrl: null },
      };
    }

    const profile = await prisma.profile.findUnique({
      where: { id: cashierId },
      include: { company: true },
    });
    if (!profile) return null;

    return {
      profileId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      status: profile.status,
      isActive: profile.status === "active",
      company: profile.company
        ? {
            id: profile.company.id,
            name: profile.company.name,
            code: profile.company.code,
            email: profile.company.email,
            phone: profile.company.phone,
            logoImageUrl: profile.company.logoImageUrl,
          }
        : { id: null, name: null, code: null, email: null, phone: null, logoImageUrl: null },
    };
  },

  async updateCashierInfo(dto: CashierInfoDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockCashiers = mockCashiers.map((c) =>
        c.profileId === dto.profileId ? { ...c, email: dto.email } : c,
      );
      return;
    }

    await prisma.profile.update({
      where: { id: dto.profileId },
      data: { fullName: dto.fullName },
    });
  },

  // ── Company ────────────────────────────────────────────────────────────────

  async companyInfo(adminId: string): Promise<CompanyDto> {
    if (USE_MOCK) {
      await delay();
      return { ...mockCompany };
    }

    const profile = await prisma.profile.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });
    if (!profile?.companyId) throw new Error("Admin has no company");

    const company = await prisma.company.findUnique({
      where: { id: profile.companyId },
    });
    if (!company) throw new Error("Company not found");

    return {
      id: company.id,
      name: company.name,
      code: company.code,
      email: company.email,
      phone: company.phone,
      logoImageUrl: company.logoImageUrl,
    };
  },

  async updateCompany(adminId: string, dto: UpdateCompanyDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockCompany = { ...mockCompany, ...dto };
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });
    if (!profile?.companyId) throw new Error("Admin has no company");

    await prisma.company.update({
      where: { id: profile.companyId },
      data: {
        name: dto.name,
        code: dto.code ?? undefined,
        email: dto.email ?? undefined,
        phone: dto.phone ?? undefined,
        logoImageUrl: dto.logoImageUrl ?? undefined,
      },
    });
  },
};
