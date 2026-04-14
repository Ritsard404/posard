"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { auditLogService } from "@/lib/services/audit-log.service";

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

    // Active session is now defined purely by an open Timestamp
    const timestamp = await prisma.timestamp.findFirst({
      where: { cashierId: profile.id, timestampOut: null },
      include: { posTerminal: true },
      orderBy: { createdAt: "desc" },
    });

    if (!timestamp) return { success: true, data: null };

    return {
      success: true,
      data: {
        sessionId: timestamp.id, // Using timestampId mapping for backwards compatibility in UI
        timestampId: timestamp.id,
        terminal: {
          id: timestamp.posTerminalId,
          name: timestamp.posTerminal.posName,
          vat: timestamp.posTerminal.vat,
          discountMax: Number(timestamp.posTerminal.discountMax),
        },
        user: { name: profile.fullName || null, role: profile.role },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

export async function getTerminalsAction() {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId)
      return { success: false, error: "No company associated with user." };
    const companyId = profile.companyId;

    const terminals = await prisma.posTerminalInfo.findMany({
      where: { companyId },
      include: {
        timestamps: {
          where: { timestampOut: null }, // Only active sessions
          include: { cashier: { select: { fullName: true } } },
        },
      },
      orderBy: { posName: "asc" },
    });

    // Map `timestamps` to `sessions` format for UI compatibility
    const mappedTerminals = terminals.map((terminal) => ({
      id: terminal.id,
      posName: terminal.posName,
      isActive: terminal.isActive,
      vat: terminal.vat,
      discountMax: Number(terminal.discountMax),
      sessions: terminal.timestamps.map((timestamp) => ({
        profile: {
          fullName: timestamp.cashier.fullName ?? null,
        },
      })),
    }));

    return { success: true, data: mappedTerminals };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch terminals",
    };
  }
}

export async function openSessionAction(
  terminalId: string,
  pin: string,
  openingCash: number = 0,
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId)
      return { success: false, error: "No company associated with user." };

    // 1. Validate PIN
    const unlocker = await prisma.profile.findFirst({
      where: { companyId: profile.companyId, pin: pin },
    });

    if (!unlocker) return { success: false, error: "Invalid PIN" };

    // 2. Validate Terminal state
    const terminal = await prisma.posTerminalInfo.findUnique({
      where: { id: terminalId },
    });

    if (!terminal || terminal.companyId !== profile.companyId) {
      return { success: false, error: "Invalid terminal" };
    }

    if (terminal.isActive) {
      return {
        success: false,
        error: "Terminal is already in use by another session.",
      };
    }

    // Also verify user does not have an active session already
    const existingUserSession = await prisma.timestamp.findFirst({
      where: { cashierId: unlocker.id, timestampOut: null },
    });

    if (existingUserSession) {
      return {
        success: false,
        error: "User already has an active POS session on another terminal.",
      };
    }

    // 3. Create Timestamp transaction
    const result = await prisma.$transaction(async (tx) => {
      // Force close any stuck sessions on this terminal
      await tx.timestamp.updateMany({
        where: { posTerminalId: terminal.id, timestampOut: null },
        data: { timestampOut: new Date(), cashOutDrawerAmount: 0 }, // emergency force close
      });

      const timestamp = await tx.timestamp.create({
        data: {
          posTerminalId: terminal.id,
          cashierId: unlocker.id,
          timestampIn: new Date(),
          cashInDrawerAmount: openingCash,
        },
      });

      await tx.posTerminalInfo.update({
        where: { id: terminal.id },
        data: { isActive: true },
      });

      return { timestamp };
    });

    return {
      success: true,
      user: { name: unlocker.fullName, role: unlocker.role },
      sessionId: result.timestamp.id,
      timestampId: result.timestamp.id,
      terminal: {
        id: terminal.id,
        name: terminal.posName,
        vat: terminal.vat,
        discountMax: Number(terminal.discountMax),
      },
    };
  } catch (error) {
    return {
      success: false,
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
    if (!profile.companyId)
      return { success: false, error: "No company associated with user." };
    const companyId = profile.companyId;

    if (amount <= 0)
      return { success: false, error: "Amount must be greater than 0" };

    // 1. Validate Manager
    const approver = await prisma.profile.findFirst({
      where: {
        companyId,
        pin: managerPin,
        role: { in: ["manager", "admin"] },
      },
    });

    if (!approver) return { success: false, error: "Invalid Manager PIN" };

    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
    });

    if (!timestamp)
      return { success: false, error: "Active session not found" };

    // 2. Validate balance and Process in Transaction
    await prisma.$transaction(async (tx) => {
      // Logic for cash track must be consistent - maybe just fetch needed counts here
      // But reportService.getTimestampCashTrack is async and uses prisma (not tx)
      // So we'll do a quick manual check or trust the pre-fetch if we use locks

      const reportData = await reportService.getTimestampCashTrack(timestampId);
      if (amount > reportData.expectedDrawerAmount) {
        throw new Error(
          `Insufficient cash in drawer. Available: ₱${reportData.expectedDrawerAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        );
      }

      await tx.timestamp.update({
        where: { id: timestampId },
        data: {
          withdrawnDrawerAmount: { increment: amount },
          withdrawnDrawerCount: { increment: 1 },
        },
      });

      await auditLogService.create(tx, {
        companyId,
        actorProfileId: approver.id,
        posTerminalId: timestamp.posTerminalId,
        actionType: "CASH_WITHDRAWAL",
        referenceId: timestamp.id,
        amount,
      });
    });

    return { success: true as const };
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
    if (!profile.companyId)
      return { success: false, error: "No company associated with user." };
    const companyId = profile.companyId;

    // 1. Validate Manager or Authorized Role
    const approver = await prisma.profile.findFirst({
      where: {
        companyId,
        pin: managerPin,
        role: { in: ["manager", "admin"] }, // Must have elevated role
      },
    });

    if (!approver) return { success: false, error: "Invalid Manager PIN" };

    // 2. Validate Session (Timestamp)
    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
    });

    if (!timestamp || timestamp.timestampOut !== null) {
      return {
        success: false,
        error: "Session is not active or does not exist.",
      };
    }

    if (countedCash < 0)
      return { success: false, error: "Counted cash cannot be negative." };

    // 3. Process the Close
    await prisma.$transaction(async (tx) => {
      await tx.timestamp.update({
        where: { id: timestampId },
        data: {
          timestampOut: new Date(),
          cashOutDrawerAmount: countedCash,
          managerOutId: approver.id,
        },
      });

      await tx.posTerminalInfo.update({
        where: { id: timestamp.posTerminalId },
        data: { isActive: false },
      });

      // Log the action purely for auditing
      await auditLogService.create(tx, {
        companyId,
        actorProfileId: approver.id,
        posTerminalId: timestamp.posTerminalId,
        actionType: "CLOSE_SESSION",
        referenceId: timestamp.id,
        amount: countedCash,
      });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}

import { reportService } from "../_services/report.service";

export async function getSessionCashTrackAction(timestampId: string) {
  try {
    const data = await reportService.getTimestampCashTrack(timestampId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
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
    const data = await reportService.getTimestampCashTrack(timestampId);
    return { success: true, availableCash: data.expectedDrawerAmount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Error",
    };
  }
}
