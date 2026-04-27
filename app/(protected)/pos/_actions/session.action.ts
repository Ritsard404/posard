"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { printConfigService } from "../_services/print-config.service";
import { reportService as posReportService } from "../_services/report.service";
import { sessionMutationService } from "../_services/session-mutation.service";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { id: true, companyId: true, role: true, fullName: true },
  });

  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function getCurrentSessionAction() {
  try {
    const profile = await getCurrentProfile();

    const timestamp = await prisma.timestamp.findFirst({
      where: { cashierId: profile.id, timestampOut: null },
      include: { posTerminal: true },
      orderBy: { createdAt: "desc" },
    });

    if (!timestamp) return { success: true as const, data: null };

    return {
      success: true as const,
      data: {
        sessionId: timestamp.id,
        timestampId: timestamp.id,
        deviceId: timestamp.deviceId ?? null,
        profileId: profile.id,
        terminal: {
          id: timestamp.posTerminalId,
          name: timestamp.posTerminal.posName ?? "Unnamed terminal",
          vat: timestamp.posTerminal.vat ?? 0,
          discountMax: timestamp.posTerminal.discountMax
            ? Number(timestamp.posTerminal.discountMax)
            : 0,
          printerConfig: printConfigService.mapPrinterConfig(timestamp.posTerminal),
        },
        user: { name: profile.fullName || null, role: profile.role },
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function getTerminalsAction() {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false as const, error: "No company associated with user." };
    }

    const terminals = await prisma.posTerminalInfo.findMany({
      where: { companyId: profile.companyId },
      include: {
        timestamps: {
          where: { timestampOut: null },
          include: { cashier: { select: { fullName: true } } },
        },
      },
      orderBy: { posName: "asc" },
    });

    return {
      success: true as const,
      data: terminals.map((terminal) => ({
        id: terminal.id,
        posName: terminal.posName ?? "Unnamed terminal",
        isActive: terminal.timestamps.length > 0,
        vat: terminal.vat ?? 0,
        discountMax: terminal.discountMax ? Number(terminal.discountMax) : 0,
        printerConfig: printConfigService.mapPrinterConfig(terminal),
        sessions: terminal.timestamps.map((timestamp) => ({
          profile: {
            fullName: timestamp.cashier.fullName ?? null,
          },
        })),
      })),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch terminals",
    };
  }
}

export async function openSessionAction(
  terminalId: string,
  managerPin: string,
  openingCash: number = 0,
  deviceId: string | null = null,
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false as const, error: "No company associated with user." };
    }

    if (!managerPin.trim()) {
      return { success: false as const, error: "Manager PIN is required." };
    }

    return await sessionMutationService.openSession(
      {
        profileId: profile.id,
        companyId: profile.companyId,
        role: profile.role,
        fullName: profile.fullName ?? null,
      },
      terminalId,
      managerPin,
      openingCash,
      deviceId,
    );
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function withdrawCashAction(
  timestampId: string,
  amount: number,
  managerPin: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false, error: "No company associated with user." };
    }

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    const approver = await prisma.profile.findFirst({
      where: {
        companyId: profile.companyId,
        pin: managerPin,
        role: { in: ["manager", "admin"] },
      },
      select: { id: true },
    });

    if (!approver) {
      return { success: false, error: "Invalid Manager PIN" };
    }

    await sessionMutationService.withdrawCashAuthorized(
      {
        profileId: profile.id,
        companyId: profile.companyId,
        role: profile.role,
        fullName: profile.fullName ?? null,
      },
      timestampId,
      amount,
      approver.id,
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function closeSessionAction(
  sessionId: string,
  timestampId: string,
  countedCash: number,
  managerPin: string,
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false as const, error: "No company associated with user." };
    }

    const approver = await prisma.profile.findFirst({
      where: {
        companyId: profile.companyId,
        pin: managerPin,
        role: { in: ["manager", "admin"] },
      },
      select: { id: true },
    });

    if (!approver) {
      return { success: false as const, error: "Invalid Manager PIN" };
    }

    const data = await sessionMutationService.closeSessionAuthorized(
      {
        profileId: profile.id,
        companyId: profile.companyId,
        role: profile.role,
        fullName: profile.fullName ?? null,
      },
      sessionId,
      timestampId,
      countedCash,
      approver.id,
    );

    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function getSessionCashTrackAction(timestampId: string) {
  try {
    const data = await posReportService.getTimestampCashTrack(timestampId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function getSessionXReadingPrintPayloadAction(timestampId: string) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false as const, error: "No company associated with user." };
    }

    const payload = await sessionMutationService.getSessionXReadingPayload(timestampId);

    if (!payload) {
      return {
        success: false as const,
        error: "Unable to build X-reading print payload.",
      };
    }

    return { success: true as const, data: payload };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function getAvailableCashAction(
  timestampId: string,
): Promise<
  { success: true; availableCash: number } | { success: false; error: string }
> {
  try {
    const data = await posReportService.getTimestampCashTrack(timestampId);
    return { success: true, availableCash: data.expectedDrawerAmount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}
