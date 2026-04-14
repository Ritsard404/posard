import { prisma } from "@/lib/prisma";
import {
  type TerminalDTO,
  type CreateTerminalInput,
  type UpdateTerminalInput,
  type TerminalConfigurationInput,
} from "./terminal.dto";

export const terminalService = {
  async getTerminalsByCompany(companyId: string): Promise<TerminalDTO[]> {
    const terminals = await prisma.posTerminalInfo.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return terminals.map((t) => ({
      ...t,
      discountMax: Number(t.discountMax),
    }));
  },

  async getTerminalById(id: string, companyId: string): Promise<TerminalDTO | null> {
    const terminal = await prisma.posTerminalInfo.findFirst({
      where: { id, companyId },
    });

    if (!terminal) return null;

    return {
      ...terminal,
      discountMax: Number(terminal.discountMax),
    };
  },

  async createTerminal(companyId: string, payload: CreateTerminalInput): Promise<TerminalDTO> {
    const terminal = await prisma.posTerminalInfo.create({
      data: {
        ...payload,
        companyId,
      },
    });

    return {
      ...terminal,
      discountMax: Number(terminal.discountMax),
    };
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

    return {
      ...terminal,
      discountMax: Number(terminal.discountMax),
    };
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

    return {
      ...terminal,
      discountMax: Number(terminal.discountMax),
    };
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

    return {
      ...terminal,
      discountMax: Number(terminal.discountMax),
    };
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
