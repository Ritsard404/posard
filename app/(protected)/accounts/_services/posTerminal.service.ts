import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  PageResult,
  PosTerminalDto,
  PosTerminalRequestDto,
} from "./profile.dto";
import type { ProfileListItem } from "./profile.service";
import { Prisma } from "@prisma/client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ── Mock data ─────────────────────────────────────────────────────────────────

const SEED_TERMINALS: PosTerminalDto[] = [
  {
    id: "pt1",
    minNumber: "MIN-001",
    accreditationNumber: "ACC-2024-001",
    ptuNumber: "PTU-001",
    dateIssued: "2024-01-15",
    validUntil: "2027-01-15",
    posName: "Main Terminal",
    registeredName: "Tech Corp Inc.",
    operatedBy: "John Doe",
    address: "123 Main St, City",
    vatTinNumber: "123-456-789-000",
    vat: 12,
    discountCapType: "percent",
    discountMax: 20,
    printerName: "EPSON-TM-T88",
    resetCounterNo: 0,
    resetCounterTrainNo: 0,
    zCounterNo: 5,
    zCounterTrainNo: 0,
    isTrainMode: false,
    companyId: "c1",
    companyName: "Tech Corp",
  },
  {
    id: "pt2",
    minNumber: "MIN-002",
    accreditationNumber: "ACC-2024-002",
    ptuNumber: "PTU-002",
    dateIssued: "2024-03-01",
    validUntil: "2027-03-01",
    posName: "Cashier 2",
    registeredName: "Tech Corp Inc.",
    operatedBy: "Jane Smith",
    address: "123 Main St, City",
    vatTinNumber: "123-456-789-000",
    vat: 12,
    discountCapType: "percent",
    discountMax: 20,
    printerName: "EPSON-TM-T88",
    resetCounterNo: 0,
    resetCounterTrainNo: 0,
    zCounterNo: 2,
    zCounterTrainNo: 0,
    isTrainMode: false,
    companyId: "c1",
    companyName: "Tech Corp",
  },
];

let mockTerminals = [...SEED_TERMINALS];

// ── Prisma sort whitelist ─────────────────────────────────────────────────────
const SORTABLE_FIELDS: Record<
  string,
  keyof Prisma.PosTerminalInfoOrderByWithRelationInput
> = {
  posName: "posName",
  minNumber: "minNumber",
  createdAt: "createdAt",
  validUntil: "validUntil",
};

// ── Mapper ────────────────────────────────────────────────────────────────────

type TerminalWithCompany = Prisma.PosTerminalInfoGetPayload<{
  include: { company: true };
}>;

function toDto(t: TerminalWithCompany): PosTerminalDto {
  return {
    id: t.id,
    minNumber: t.minNumber,
    accreditationNumber: t.accreditationNumber,
    ptuNumber: t.ptuNumber,
    dateIssued: t.dateIssued.toISOString().split("T")[0],
    validUntil: t.validUntil.toISOString().split("T")[0],
    posName: t.posName,
    registeredName: t.registeredName,
    operatedBy: t.operatedBy,
    address: t.address,
    vatTinNumber: t.vatTinNumber,
    vat: t.vat,
    discountCapType: t.discountCapType,
    discountMax: t.discountMax ? Number(t.discountMax) : null,
    printerName: t.printerName,
    resetCounterNo: t.resetCounterNo,
    resetCounterTrainNo: t.resetCounterTrainNo,
    zCounterNo: t.zCounterNo,
    zCounterTrainNo: t.zCounterTrainNo,
    isTrainMode: t.isTrainMode,
    companyId: t.companyId,
    companyName: t.company.name,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const posTerminalService = {
  async getPosTerminalById(id: string): Promise<PosTerminalDto | null> {
    if (USE_MOCK) {
      await delay();
      return mockTerminals.find((t) => t.id === id) ?? null;
    }

    const terminal = await prisma.posTerminalInfo.findUnique({
      where: { id },
      include: { company: true },
    });
    return terminal ? toDto(terminal) : null;
  },

  /** Terminals belonging to the calling admin's company. */
  async getPosTerminalByCompany(
    adminId: string,
    params?: {
      page?: number;
      size?: number;
      sortBy?: string;
      direction?: "asc" | "desc";
    },
  ): Promise<PageResult<PosTerminalDto>> {
    if (USE_MOCK) {
      await delay();
      const page = params?.page ?? 0;
      const size = params?.size ?? 10;
      return {
        content: mockTerminals.slice(page * size, page * size + size),
        total: mockTerminals.length,
        page,
        size,
        totalPages: Math.ceil(mockTerminals.length / size),
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
        ? SORTABLE_FIELDS[params.sortBy]
        : "createdAt";

    const where: Prisma.PosTerminalInfoWhereInput = {
      companyId: admin.companyId,
    };
    const page = params?.page ?? 0;
    const size = params?.size ?? 10;

    const [total, terminals] = await Promise.all([
      prisma.posTerminalInfo.count({ where }),
      prisma.posTerminalInfo.findMany({
        where,
        include: { company: true },
        skip: page * size,
        take: size,
        orderBy: { [orderByKey]: params?.direction ?? "desc" },
      }),
    ]);

    return {
      content: terminals.map(toDto),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  /** All terminals across all companies (superadmin). */
  async getPosTerminals(params?: {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<PageResult<PosTerminalDto>> {
    if (USE_MOCK) {
      await delay();
      const kw = params?.keyword?.toLowerCase() ?? "";
      const filtered = kw
        ? mockTerminals.filter(
            (t) =>
              (t.posName ?? "").toLowerCase().includes(kw) ||
              (t.registeredName ?? "").toLowerCase().includes(kw) ||
              (t.minNumber ?? "").toLowerCase().includes(kw),
          )
        : mockTerminals;
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

    const orderByKey =
      params?.sortBy && SORTABLE_FIELDS[params.sortBy]
        ? SORTABLE_FIELDS[params.sortBy]
        : "createdAt";

    const where: Prisma.PosTerminalInfoWhereInput = params?.keyword
      ? {
          OR: [
            { posName: { contains: params.keyword, mode: "insensitive" } },
            {
              registeredName: { contains: params.keyword, mode: "insensitive" },
            },
            { minNumber: { contains: params.keyword, mode: "insensitive" } },
          ],
        }
      : {};

    const page = params?.page ?? 0;
    const size = params?.size ?? 10;

    const [total, terminals] = await Promise.all([
      prisma.posTerminalInfo.count({ where }),
      prisma.posTerminalInfo.findMany({
        where,
        include: { company: true },
        skip: page * size,
        take: size,
        orderBy: { [orderByKey]: params?.direction ?? "desc" },
      }),
    ]);

    return {
      content: terminals.map(toDto),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  /** Create a blank terminal for the admin's company. */
  async newPosTerminal(
    adminMember: Pick<ProfileListItem, "id" | "company">,
  ): Promise<void> {
    if (USE_MOCK) {
      await delay();
      const today = new Date();
      const threeYearsOut = new Date(today);
      threeYearsOut.setFullYear(threeYearsOut.getFullYear() + 3);
      mockTerminals = [
        ...mockTerminals,
        {
          id: `pt${Date.now()}`,
          minNumber: "",
          accreditationNumber: "",
          ptuNumber: "",
          dateIssued: today.toISOString().split("T")[0],
          validUntil: threeYearsOut.toISOString().split("T")[0],
          posName: "New Terminal",
          registeredName: adminMember.company?.name ?? "",
          operatedBy: adminMember.id,
          address: "",
          vatTinNumber: "",
          vat: 12,
          discountCapType: "amount",
          discountMax: null,
          printerName: "",
          resetCounterNo: 0,
          resetCounterTrainNo: 0,
          zCounterNo: 0,
          zCounterTrainNo: 0,
          isTrainMode: false,
          companyId: adminMember.company?.id ?? "",
          companyName: adminMember.company?.name ?? "",
        },
      ];
      return;
    }

    const member = await prisma.profile.findUnique({
      where: { id: adminMember.id },
      select: { companyId: true },
    });
    if (!member?.companyId) throw new Error("Admin has no company");

    const today = new Date();
    const threeYearsOut = new Date(today);
    threeYearsOut.setFullYear(threeYearsOut.getFullYear() + 3);

    await prisma.posTerminalInfo.create({
      data: {
        companyId: member.companyId,
        minNumber: "",
        accreditationNumber: "",
        ptuNumber: "",
        dateIssued: today,
        validUntil: threeYearsOut,
        posName: "New Terminal",
        registeredName: "",
        operatedBy: adminMember.id,
        address: "",
        vatTinNumber: "",
        vat: 12,
        discountCapType: "amount",
        discountMax: null,
        printerName: "",
      },
    });
  },

  /** Soft-deactivate by switching to training mode to prevent live transactions. */
  async deactivatePosTerminal(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockTerminals = mockTerminals.map((t) =>
        t.id === id ? { ...t, isTrainMode: true } : t,
      );
      return;
    }

    await prisma.posTerminalInfo.update({
      where: { id },
      data: { isTrainMode: true },
    });
  },

  async deletePosTerminal(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockTerminals = mockTerminals.filter((t) => t.id !== id);
      return;
    }

    await prisma.posTerminalInfo.delete({ where: { id } });
  },

  async updatePosTerminal(dto: PosTerminalRequestDto): Promise<void> {
    if (USE_MOCK) {
      await delay();
      mockTerminals = mockTerminals.map((t) =>
        t.id === dto.id ? { ...t, ...dto } : t,
      );
      return;
    }

    await prisma.posTerminalInfo.update({
      where: { id: dto.id },
      data: {
        minNumber: dto.minNumber,
        accreditationNumber: dto.accreditationNumber,
        ptuNumber: dto.ptuNumber,
        dateIssued: new Date(dto.dateIssued),
        validUntil: new Date(dto.validUntil),
        posName: dto.posName,
        registeredName: dto.registeredName,
        operatedBy: dto.operatedBy,
        address: dto.address,
        vatTinNumber: dto.vatTinNumber,
        vat: dto.vat,
        discountCapType: dto.discountCapType,
        discountMax: dto.discountMax,
        printerName: dto.printerName,
        isTrainMode: dto.isTrainMode,
      },
    });
  },
};
