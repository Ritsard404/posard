import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Prisma } from "@prisma/client";
import {
  buildIdleCustomerDisplayDTO,
  sanitizeCustomerDisplayDTO,
  type CustomerDisplayDTO,
  type CustomerDisplayMetaDTO,
} from "./_dto/customer-display.dto";

interface CustomerDisplayViewer {
  id: string;
  role: "admin" | "manager" | "cashier";
  companyId: string | null;
}

async function getViewer(): Promise<CustomerDisplayViewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id, status: "active" },
    select: { id: true, role: true, companyId: true },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

async function getAccessibleTerminal(
  viewer: CustomerDisplayViewer,
  terminalId: string,
) {
  return prisma.posTerminalInfo.findFirst({
    where: {
      id: terminalId,
      ...(viewer.role === "admin" ? {} : { companyId: viewer.companyId ?? "" }),
    },
    select: {
      id: true,
      posName: true,
      companyId: true,
      registeredName: true,
      company: {
        select: {
          name: true,
          logoImageUrl: true,
        },
      },
    },
  });
}

export const customerDisplayService = {
  async getInitialDisplay(terminalId: string): Promise<{
    meta: CustomerDisplayMetaDTO;
    display: CustomerDisplayDTO;
  }> {
    const viewer = await getViewer();
    const terminal = await getAccessibleTerminal(viewer, terminalId);

    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const state = await prisma.customerDisplayState.findUnique({
      where: { terminalId },
      select: { payload: true },
    });

    return {
      meta: {
        terminalId: terminal.id,
        terminalName: terminal.posName ?? "Customer Display",
        storeName:
          terminal.company.name ||
          terminal.registeredName ||
          terminal.posName ||
          "POSard",
        logoImageUrl: terminal.company.logoImageUrl,
      },
      display: state
        ? sanitizeCustomerDisplayDTO(state.payload, terminal.id)
        : buildIdleCustomerDisplayDTO(terminal.id),
    };
  },

  async getSnapshot(terminalId: string): Promise<CustomerDisplayDTO> {
    const viewer = await getViewer();
    const terminal = await getAccessibleTerminal(viewer, terminalId);

    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const state = await prisma.customerDisplayState.findUnique({
      where: { terminalId },
      select: { payload: true },
    });

    return state
      ? sanitizeCustomerDisplayDTO(state.payload, terminal.id)
      : buildIdleCustomerDisplayDTO(terminal.id);
  },

  async publishSnapshot(display: CustomerDisplayDTO): Promise<CustomerDisplayDTO> {
    const viewer = await getViewer();
    const terminal = await getAccessibleTerminal(viewer, display.terminalId);

    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const sanitized = sanitizeCustomerDisplayDTO(
      {
        ...display,
        updatedAt: new Date().toISOString(),
      },
      terminal.id,
    );

    await prisma.customerDisplayState.upsert({
      where: { terminalId: terminal.id },
      create: {
        terminalId: terminal.id,
        companyId: terminal.companyId,
        payload: sanitized as unknown as Prisma.InputJsonValue,
      },
      update: {
        companyId: terminal.companyId,
        payload: sanitized as unknown as Prisma.InputJsonValue,
      },
    });

    return sanitized;
  },
};
