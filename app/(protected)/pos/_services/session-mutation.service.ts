import "server-only";

import { assertTerminalBillingAllowsPos } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";
import { findProfileByPin } from "@/lib/security/pin";
import { auditLogService } from "@/lib/services/audit-log.service";
import { printConfigService } from "./print-config.service";
import { reportService as posReportService } from "./report.service";
import { reportPrintService } from "@/app/(protected)/report/_services/report-print.service";
import { reportService as reportFeatureService } from "@/app/(protected)/report/_services/report.service";
import type { ReportPrintPayloadDto } from "@/app/(protected)/report/_services/_dto/report.dto";

export interface SessionActorContext {
  profileId: string;
  companyId: string;
  branchId: string | null;
  role: string;
  fullName: string | null;
}

async function buildSessionXReadingPrintPayload(
  timestampId: string,
): Promise<ReportPrintPayloadDto | null> {
  const timestamp = await prisma.timestamp.findUnique({
    where: { id: timestampId },
    select: {
      posTerminalId: true,
      posTerminal: {
        select: {
          id: true,
          posName: true,
          isActive: true,
          printerName: true,
          printerDisplayName: true,
          printerConnectionType: true,
          printerTransport: true,
          printerDriver: true,
          printerVendorId: true,
          printerProductId: true,
          printerDeviceId: true,
          printerServiceUuid: true,
          printerCharacteristicUuid: true,
          autoPrintEnabled: true,
        },
      },
    },
  });

  if (!timestamp) {
    return null;
  }

  const detail = await reportFeatureService.getXReadingByTimestampId(timestampId);

  return reportPrintService.buildPayload({
    view: "x-reading",
    overview: null,
    detail,
    selectedTerminal: {
      id: timestamp.posTerminal.id,
      name: timestamp.posTerminal.posName ?? "Unnamed terminal",
      isActive: timestamp.posTerminal.isActive,
      printerName: timestamp.posTerminal.printerName,
      printerConfig: printConfigService.mapPrinterConfig(timestamp.posTerminal),
    },
  });
}

export const sessionMutationService = {
  async openSession(
    actor: SessionActorContext,
    terminalId: string,
    managerPin: string,
    openingCash: number,
    deviceId: string | null,
  ) {
    await assertTerminalBillingAllowsPos(actor.companyId, terminalId);

    const terminal = await prisma.posTerminalInfo.findUnique({
      where: { id: terminalId },
    });

    if (!terminal || terminal.companyId !== actor.companyId) {
      throw new Error("Invalid terminal");
    }

    let approverProfileId: string | null = null;

    if (!terminal.pinlessModeEnabled) {
      if (!managerPin.trim()) {
        throw new Error("Manager PIN is required.");
      }

      const approver = await findProfileByPin({
        companyId: actor.companyId,
        pin: managerPin,
        roles: ["manager", "admin"],
        select: { id: true, status: true },
      });

      if (!approver || approver.status !== "active") {
        throw new Error("Invalid Manager PIN");
      }

      approverProfileId = approver.id as string;
    }

    if (actor.role === "cashier") {
      if (!actor.branchId) {
        throw new Error("No branch assigned. Please contact your manager.");
      }

      if (terminal.branchId !== actor.branchId) {
        throw new Error("This terminal is not assigned to your branch.");
      }
    }

    const activeTerminalSession = await prisma.timestamp.findFirst({
      where: { posTerminalId: terminal.id, timestampOut: null },
      select: { id: true, deviceId: true },
    });

    if (activeTerminalSession) {
      throw new Error("Terminal is already in use by another session.");
    }

    const activeUserSession = await prisma.timestamp.findFirst({
      where: { cashierId: actor.profileId, timestampOut: null },
      select: { id: true, posTerminal: { select: { posName: true } } },
    });

    if (activeUserSession) {
      throw new Error(
        `You already have an active POS session${activeUserSession.posTerminal.posName ? ` on ${activeUserSession.posTerminal.posName}` : ""}.`,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const timestamp = await tx.timestamp.create({
        data: {
          posTerminalId: terminal.id,
          branchId: terminal.branchId,
          cashierId: actor.profileId,
          managerInId: approverProfileId,
          timestampIn: new Date(),
          cashInDrawerAmount: openingCash,
          deviceId,
          lastSeenAt: new Date(),
        },
      });

      await tx.posTerminalInfo.update({
        where: { id: terminal.id },
        data: { isActive: true },
      });

      await auditLogService.create(tx, {
        companyId: actor.companyId,
        actorProfileId: approverProfileId ?? actor.profileId,
        posTerminalId: terminal.id,
        actionType: "OPEN_SESSION",
        referenceId: timestamp.id,
        changes: JSON.stringify({
          cashierId: actor.profileId,
          openingCash,
          deviceId,
        }),
        amount: openingCash,
      });

      return { timestamp };
    });

      return {
        success: true as const,
        profileId: actor.profileId,
        user: { name: actor.fullName, role: actor.role },
        sessionId: result.timestamp.id,
        timestampId: result.timestamp.id,
        terminal: {
          id: terminal.id,
          name: terminal.posName ?? "Unnamed terminal",
          vat: terminal.vat ?? 0,
          discountCapType: terminal.discountCapType,
          discountMax: terminal.discountMax ? Number(terminal.discountMax) : 0,
          allowCashierDebtCreate: terminal.allowCashierDebtCreate,
          allowCashierDebtCollect: terminal.allowCashierDebtCollect,
          requireManagerApprovalForDebt: terminal.requireManagerApprovalForDebt,
          pinlessModeEnabled: terminal.pinlessModeEnabled,
          defaultDebtDueDays: terminal.defaultDebtDueDays ?? null,
          businessMode: terminal.businessModeOverride ?? "RETAIL",
          enableFulfillmentTypes: terminal.enableFulfillmentTypes,
          enableRestaurantFeatures: terminal.enableRestaurantFeatures,
          enableTableService: terminal.enableTableService,
          enableDeliveryDetails: terminal.enableDeliveryDetails,
          enableProductModifiers: terminal.enableProductModifiers,
          printerConfig: printConfigService.mapPrinterConfig(terminal),
        },
      };
  },

  async withdrawCashAuthorized(
    actor: SessionActorContext,
    timestampId: string,
    amount: number,
    approverProfileId: string | null,
  ) {
    const timestampForBilling = await prisma.timestamp.findUnique({
      where: { id: timestampId },
      select: { posTerminalId: true },
    });

    if (!timestampForBilling) {
      throw new Error("Active session not found");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (approverProfileId) {
      const approver = await prisma.profile.findFirst({
        where: {
          id: approverProfileId,
          companyId: actor.companyId,
          role: { in: ["manager", "admin"] },
        },
        select: { id: true },
      });

      if (!approver) {
        throw new Error("Manager approval is no longer valid.");
      }
    }

    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
    });

    if (!timestamp || timestamp.timestampOut !== null) {
      throw new Error("Active session not found");
    }

    await prisma.$transaction(async (tx) => {
      const reportData = await posReportService.getTimestampCashTrack(timestampId);
      if (amount > reportData.expectedDrawerAmount) {
        throw new Error(
          `Insufficient cash in drawer. Available: PHP ${reportData.expectedDrawerAmount.toFixed(2)}`,
        );
      }

      await tx.timestamp.update({
        where: { id: timestampId },
        data: {
          withdrawnDrawerAmount: { increment: amount },
          withdrawnDrawerCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });

      await auditLogService.create(tx, {
        companyId: actor.companyId,
        actorProfileId: approverProfileId ?? actor.profileId,
        posTerminalId: timestamp.posTerminalId,
        actionType: "CASH_WITHDRAWAL",
        referenceId: timestamp.id,
        changes: JSON.stringify({
          cashierId: actor.profileId,
          expectedDrawerAmountBeforeWithdrawal: reportData.expectedDrawerAmount,
        }),
        amount,
      });
    });
  },

  async closeSessionAuthorized(
    actor: SessionActorContext,
    sessionId: string,
    timestampId: string,
    countedCash: number,
    approverProfileId: string | null,
  ) {
    const timestampForBilling = await prisma.timestamp.findUnique({
      where: { id: timestampId },
      select: { posTerminalId: true },
    });

    if (!timestampForBilling) {
      throw new Error("Session is not active or does not exist.");
    }

    if (approverProfileId) {
      const approver = await prisma.profile.findFirst({
        where: {
          id: approverProfileId,
          companyId: actor.companyId,
          role: { in: ["manager", "admin"] },
        },
        select: { id: true },
      });

      if (!approver) {
        throw new Error("Manager approval is no longer valid.");
      }
    }

    const timestamp = await prisma.timestamp.findUnique({
      where: { id: timestampId },
    });

    if (!timestamp || timestamp.timestampOut !== null) {
      throw new Error("Session is not active or does not exist.");
    }

    if (countedCash < 0) {
      throw new Error("Counted cash cannot be negative.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.timestamp.update({
        where: { id: timestampId },
        data: {
          timestampOut: new Date(),
          cashOutDrawerAmount: countedCash,
          managerOutId: approverProfileId,
          lastSeenAt: new Date(),
        },
      });

      await tx.posTerminalInfo.update({
        where: { id: timestamp.posTerminalId },
        data: { isActive: false },
      });

      await auditLogService.create(tx, {
        companyId: actor.companyId,
        actorProfileId: approverProfileId ?? actor.profileId,
        posTerminalId: timestamp.posTerminalId,
        actionType: "CLOSE_SESSION",
        referenceId: timestamp.id,
        changes: JSON.stringify({
          cashierId: actor.profileId,
          countedCash,
        }),
        amount: countedCash,
      });
    });

    const xReadingPayload = await buildSessionXReadingPrintPayload(timestampId);

    return {
      sessionId,
      timestampId,
      xReadingPayload,
    };
  },

  async getSessionXReadingPayload(timestampId: string) {
    return buildSessionXReadingPrintPayload(timestampId);
  },

  async touchTimestamp(timestampId: string, deviceId: string | null) {
    await prisma.timestamp.updateMany({
      where: { id: timestampId, timestampOut: null },
      data: {
        lastSeenAt: new Date(),
        ...(deviceId ? { deviceId } : {}),
      },
    });
  },
};
