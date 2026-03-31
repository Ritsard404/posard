import "server-only";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminInfoDto,
  CashierInfoDto,
  CompanyDto,
  MyCashiersDto,
  PageResult,
  RegisterCashierDto,
  UpdateCompanyDto,
} from "./member.dto";
import { MOCK_MEMBERS } from "./member.mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ── Mock stores ───────────────────────────────────────────────────────────────

let mockAdmin: AdminInfoDto = {
  memberId: "admin-1",
  firstName: "John",
  lastName: "Doe",
  username: "admin_john",
  company: {
    uuid: "c1",
    name: "Tech Corp",
    code: "COMP01",
    email: "admin@techcorp.com",
    phone: "555-0100",
    logoImageUrl: null,
  },
};

let mockCompany: CompanyDto = {
  uuid: "c1",
  name: "Tech Corp",
  code: "COMP01",
  email: "admin@techcorp.com",
  phone: "555-0100",
  logoImageUrl: null,
  approved: true,
};

let mockCashiers: MyCashiersDto[] = MOCK_MEMBERS.filter(
  (m) => m.permission === "cashier",
).map((m) => ({
  memberId: m.memberId,
  identifier: m.identifier,
  approvalStatus: m.approvalStatus,
  isActive: m.isActive,
}));

// ── Prisma sort whitelist ─────────────────────────────────────────────────────
const SORTABLE_FIELDS: Record<
  string,
  keyof Prisma.MemberOrderByWithRelationInput
> = {
  firstName: "firstName",
  lastName: "lastName",
  username: "username",
  createdAt: "createdAt",
  approvalStatus: "approvalStatus",
};

// ── Service ───────────────────────────────────────────────────────────────────

export const adminService = {
  // ── Admin Profile ──────────────────────────────────────────────────────────

  async adminProfile(adminId: string): Promise<AdminInfoDto> {
    if (USE_MOCK) {
      await delay();
      return { ...mockAdmin };
    }

    const member = await prisma.member.findUnique({
      where: { id: adminId },
      include: { company: true },
    });
    if (!member) throw new Error("Admin not found");

    return {
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      username: member.username,
      company: member.company
        ? {
            uuid: member.company.id,
            name: member.company.name,
            code: member.company.code,
            email: member.company.email,
            phone: member.company.phone,
            logoImageUrl: member.company.logoImageUrl,
          }
        : {
            uuid: null,
            name: null,
            code: null,
            email: null,
            phone: null,
            logoImageUrl: null,
          },
    };
  },

  async updateAdminProfile(dto: AdminInfoDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockAdmin = { ...mockAdmin, ...dto };
      return;
    }

    await prisma.member.update({
      where: { id: dto.memberId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username ?? undefined,
      },
    });
  },

  // ── My Cashiers ────────────────────────────────────────────────────────────
  // adminId: the calling admin's Member ID (used to resolve their company)

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
        (c) => !kw || c.identifier.toLowerCase().includes(kw),
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

    const admin = await prisma.member.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });
    if (!admin?.companyId)
      return { content: [], total: 0, page: 0, size: 10, totalPages: 0 };

    const orderByKey =
      params?.sortBy && SORTABLE_FIELDS[params.sortBy]
        ? SORTABLE_FIELDS[params.sortBy]
        : "createdAt";

    const where: Prisma.MemberWhereInput = {
      companyId: admin.companyId,
      memberIsDeleted: false,
      ...(params?.keyword
        ? {
            OR: [
              { username: { contains: params.keyword, mode: "insensitive" } },
              { firstName: { contains: params.keyword, mode: "insensitive" } },
              { lastName: { contains: params.keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const page = params?.page ?? 0;
    const size = params?.size ?? 10;

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          approvalStatus: true,
          memberIsDeleted: true,
        },
        skip: page * size,
        take: size,
        orderBy: { [orderByKey]: params?.direction ?? "desc" },
      }),
    ]);

    return {
      content: members.map((m) => ({
        memberId: m.id,
        identifier:
          m.username ??
          (`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.id),
        approvalStatus: m.memberIsDeleted
          ? "REJECTED"
          : (m.approvalStatus as "PENDING" | "APPROVED"),
        isActive: m.approvalStatus === "APPROVED" && !m.memberIsDeleted,
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
          memberId: `m${Date.now()}`,
          identifier: dto.username,
          approvalStatus: "PENDING",
          isActive: false,
        },
      ];
      return;
    }

    await prisma.member.create({
      data: {
        username: dto.username,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        companyId: dto.companyId,
        approvalStatus: "PENDING",
      },
    });
    // TODO: send invite / credential email via Supabase auth or mailer
  },

  // ── Cashier Info ───────────────────────────────────────────────────────────

  async cashierInfo(cashierId: string): Promise<CashierInfoDto | null> {
    if (USE_MOCK) {
      await delay();
      const member = MOCK_MEMBERS.find((m) => m.memberId === cashierId);
      if (!member) return null;
      return {
        memberId: member.memberId,
        firstName: member.identifier,
        lastName: null,
        username: member.identifier,
        approvalStatus: member.approvalStatus,
        isActive: member.isActive,
        company: member.company,
      };
    }

    const member = await prisma.member.findUnique({
      where: { id: cashierId },
      include: { company: true },
    });
    if (!member) return null;

    return {
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      username: member.username,
      approvalStatus: member.memberIsDeleted
        ? "REJECTED"
        : (member.approvalStatus as "PENDING" | "APPROVED"),
      isActive: member.approvalStatus === "APPROVED" && !member.memberIsDeleted,
      company: member.company
        ? {
            uuid: member.company.id,
            name: member.company.name,
            code: member.company.code,
            email: member.company.email,
            phone: member.company.phone,
            logoImageUrl: member.company.logoImageUrl,
          }
        : {
            uuid: null,
            name: null,
            code: null,
            email: null,
            phone: null,
            logoImageUrl: null,
          },
    };
  },

  async updateCashierInfo(dto: CashierInfoDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockCashiers = mockCashiers.map((c) =>
        c.memberId === dto.memberId
          ? { ...c, identifier: dto.username ?? c.identifier }
          : c,
      );
      return;
    }

    await prisma.member.update({
      where: { id: dto.memberId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username ?? undefined,
      },
    });
  },

  // ── Company ────────────────────────────────────────────────────────────────
  // adminId: the calling admin's Member ID

  async companyInfo(adminId: string): Promise<CompanyDto> {
    if (USE_MOCK) {
      await delay();
      return { ...mockCompany };
    }

    const member = await prisma.member.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });
    if (!member?.companyId) throw new Error("Admin has no company");

    const company = await prisma.company.findUnique({
      where: { id: member.companyId },
    });
    if (!company) throw new Error("Company not found");

    return {
      uuid: company.id,
      name: company.name,
      code: company.code,
      email: company.email,
      phone: company.phone,
      logoImageUrl: company.logoImageUrl,
      approved: company.approved,
    };
  },

  async updateCompany(adminId: string, dto: UpdateCompanyDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockCompany = { ...mockCompany, ...dto };
      return;
    }

    const member = await prisma.member.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });
    if (!member?.companyId) throw new Error("Admin has no company");

    await prisma.company.update({
      where: { id: member.companyId },
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
