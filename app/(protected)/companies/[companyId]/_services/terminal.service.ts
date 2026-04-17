import { prisma } from "@/lib/prisma";
import {
  type TerminalDTO,
  type CreateTerminalInput,
  type UpdateTerminalInput,
  type TerminalConfigurationInput,
  type SetTerminalActiveInput,
} from "./terminal.dto";
import { printConfigService } from "@/app/(protected)/pos/_services/print-config.service";

function mapTerminal(terminal: {
  id: string;
  minNumber: string;
  accreditationNumber: string;
  ptuNumber: string;
  dateIssued: Date;
  validUntil: Date;
  posName: string;
  registeredName: string;
  operatedBy: string;
  address: string;
  vatTinNumber: string;
  vat: number;
  discountMax: { toNumber(): number };
  costCenter: string;
  branchCenter: string;
  useCenter: string;
  dbName: string | null;
  printerName: string;
  printerDisplayName: string | null;
  printerConnectionType: "usb" | "bluetooth" | null;
  printerVendorId: number | null;
  printerProductId: number | null;
  printerDeviceId: string | null;
  printerServiceUuid: string | null;
  printerCharacteristicUuid: string | null;
  autoPrintEnabled: boolean;
  resetCounterNo: number;
  resetCounterTrainNo: number;
  zCounterNo: number;
  zCounterTrainNo: number;
  isTrainMode: boolean;
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  company?: { name: string } | null;
  subscription?: { status: "pending" | "active" | "expired" | "suspended" | "cancelled"; expiresAt: Date | null } | null;
  sessions?: Array<{ profile: { fullName: string | null; email: string } }>;
}): TerminalDTO {
  const activeSession = terminal.sessions?.[0];

  return {
    ...terminal,
    printerConfig: printConfigService.mapPrinterConfig(terminal),
    discountMax: terminal.discountMax.toNumber(),
    companyName: terminal.company?.name ?? null,
    subscriptionStatus: terminal.subscription?.status ?? null,
    subscriptionExpiresAt: terminal.subscription?.expiresAt ?? null,
    assignedUserName: activeSession?.profile.fullName ?? activeSession?.profile.email ?? null,
    isInUse: Boolean(activeSession),
  };
}

export const terminalService = {
  async getTerminalsByCompany(companyId: string): Promise<TerminalDTO[]> {
    const terminals = await prisma.posTerminalInfo.findMany({
      where: { companyId },
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
      orderBy: { createdAt: "desc" },
    });

    return terminals.map(mapTerminal);
  },

  async getTerminalById(id: string, companyId: string): Promise<TerminalDTO | null> {
    const terminal = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId },
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
    });

    if (!terminal) return null;

    return mapTerminal(terminal);
  },

  async createTerminal(companyId: string, payload: CreateTerminalInput): Promise<TerminalDTO> {
    const terminal = await prisma.posTerminalInfo.create({
      data: {
        ...payload,
        companyId,
      },
    });

    return this.getTerminalById(terminal.id, companyId).then((item) => {
      if (!item) {
        throw new Error("Terminal not found");
      }

      return item;
    });
  },

  async updateTerminal(id: string, companyId: string, payload: UpdateTerminalInput): Promise<TerminalDTO> {
    const existing = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId }
    });
    if (!existing) throw new Error("Terminal not found");

    const terminal = await prisma.posTerminalInfo.update({
      where: { id },
      data: payload,
    });

    return this.getTerminalById(terminal.id, companyId).then((item) => {
      if (!item) {
        throw new Error("Terminal not found");
      }

      return item;
    });
  },

  async setTrainingMode(id: string, companyId: string, isTrainMode: boolean): Promise<TerminalDTO> {
    const existing = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new Error("Terminal not found");
    }

    const terminal = await prisma.posTerminalInfo.update({
      where: { id },
      data: { isTrainMode },
    });

    return this.getTerminalById(terminal.id, companyId).then((item) => {
      if (!item) {
        throw new Error("Terminal not found");
      }

      return item;
    });
  },

  async updateTerminalConfiguration(
    id: string,
    companyId: string,
    payload: TerminalConfigurationInput,
  ): Promise<TerminalDTO> {
    const existing = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new Error("Terminal not found");
    }

    const terminal = await prisma.posTerminalInfo.update({
      where: { id },
      data: {
        vat: payload.vat,
        discountMax: payload.discountMax,
        vatTinNumber: payload.vatTinNumber,
        address: payload.address,
        costCenter: payload.costCenter,
        branchCenter: payload.branchCenter,
        useCenter: payload.useCenter,
        printerName: payload.printerName,
      },
    });

    return this.getTerminalById(terminal.id, companyId).then((item) => {
      if (!item) {
        throw new Error("Terminal not found");
      }

      return item;
    });
  },

  async setTerminalActive(
    id: string,
    companyId: string,
    payload: SetTerminalActiveInput,
  ): Promise<TerminalDTO> {
    const terminal = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        isActive: true,
        subscription: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!terminal) {
      throw new Error("Terminal not found");
    }

    if (payload.isActive) {
      const now = new Date();
      const subscription = terminal.subscription;
      const hasActiveSubscription =
        subscription?.status === "active" &&
        (!subscription.expiresAt || subscription.expiresAt >= now);

      if (!hasActiveSubscription) {
        throw new Error("A terminal requires an active subscription before it can be enabled");
      }
    }

    await prisma.posTerminalInfo.update({
      where: { id },
      data: {
        isActive: payload.isActive,
      },
    });

    const updated = await this.getTerminalById(id, companyId);

    if (!updated) {
      throw new Error("Terminal not found");
    }

    return updated;
  },

  async deleteTerminal(id: string, companyId: string): Promise<void> {
    const existing = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId }
    });
    if (!existing) throw new Error("Terminal not found");

    await prisma.posTerminalInfo.delete({
      where: { id },
    });
  },
};
