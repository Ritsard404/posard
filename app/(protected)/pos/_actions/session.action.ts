"use server";

import { randomUUID } from "node:crypto";

import {
  hasCoverageDatePassed,
  assertTerminalBillingAllowsPos,
  TERMINAL_BILLING_TRANSACTION_RESTRICTION_MESSAGE,
  TERMINAL_BILLING_RESTRICTION_MESSAGE,
  getPlatformBillingMode,
  isTerminalPosAccessible,
  isPlatformBillingFree,
  type PlatformBillingMode,
} from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { printConfigService } from "../_services/print-config.service";
import { reportService as posReportService } from "../_services/report.service";
import { sessionMutationService } from "../_services/session-mutation.service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { findProfileByPin } from "@/lib/security/pin";
import { toSafeActionError } from "@/lib/security/safe-action-error";

function getTerminalBillingSummary(
  subscription: {
    status: "pending" | "active" | "expired" | "suspended" | "cancelled";
    expiresAt: Date | null;
  } | null,
  isDefaultTerminal: boolean,
  validUntil: Date,
  platformBillingMode: PlatformBillingMode,
): {
  statusLabel: string;
  statusTone: "success" | "warning" | "danger";
  actionLabel: string | null;
  message: string | null;
} {
  if (isPlatformBillingFree(platformBillingMode)) {
    return {
      statusLabel: "Free mode",
      statusTone: "success",
      actionLabel: null,
      message:
        "POSard is currently free. Subscription status is informational only.",
    };
  }

  if (isDefaultTerminal) {
    return {
      statusLabel: "Available",
      statusTone: "success",
      actionLabel: null,
      message: null,
    };
  }

  if (!subscription) {
    return {
      statusLabel: "Subscription required",
      statusTone: "danger",
      actionLabel: "Subscribe now",
      message: TERMINAL_BILLING_RESTRICTION_MESSAGE,
    };
  }

  const isSubscriptionExpired = hasCoverageDatePassed(
    subscription.expiresAt,
    false,
  );
  const isTerminalValidityExpired = hasCoverageDatePassed(validUntil);

  if (
    subscription.status === "active" &&
    !isSubscriptionExpired &&
    !isTerminalValidityExpired
  ) {
    return {
      statusLabel: subscription.expiresAt ? "Active plan" : "Active open plan",
      statusTone: "success",
      actionLabel: subscription.expiresAt
        ? "Monitor renewal"
        : "Review billing setup",
      message: subscription.expiresAt
        ? `Subscription is covered until ${subscription.expiresAt.toLocaleDateString()}.`
        : "Subscription is active without an expiry date.",
    };
  }

  if (isTerminalValidityExpired) {
    return {
      statusLabel: "Expired",
      statusTone: "danger",
      actionLabel: "Renew now",
      message: `Terminal validity ended on ${validUntil.toLocaleDateString()}.`,
    };
  }

  if (subscription.status === "pending") {
    return {
      statusLabel: "Pending payment",
      statusTone: "warning",
      actionLabel: "Collect payment",
      message: "Billing is waiting for payment confirmation or activation.",
    };
  }

  if (subscription.status === "suspended") {
    return {
      statusLabel: "Suspended",
      statusTone: "danger",
      actionLabel: "Settle balance",
      message: TERMINAL_BILLING_RESTRICTION_MESSAGE,
    };
  }

  if (subscription.status === "cancelled") {
    return {
      statusLabel: "Cancelled",
      statusTone: "danger",
      actionLabel: "Restore plan",
      message: TERMINAL_BILLING_RESTRICTION_MESSAGE,
    };
  }

  return {
    statusLabel: "Expired",
    statusTone: "danger",
    actionLabel: "Renew now",
    message: TERMINAL_BILLING_RESTRICTION_MESSAGE,
  };
}

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      role: true,
      fullName: true,
    },
  });

  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function getCurrentSessionAction() {
  try {
    const profile = await getCurrentProfile();

    const timestamp = await prisma.timestamp.findFirst({
      where: { cashierId: profile.id, timestampOut: null },
      select: {
        id: true,
        deviceId: true,
        posTerminalId: true,
        posTerminal: {
          select: {
            id: true,
            posName: true,
            vat: true,
            discountCapType: true,
            discountMax: true,
            allowCashierDebtCreate: true,
            allowCashierDebtCollect: true,
            requireManagerApprovalForDebt: true,
            pinlessModeEnabled: true,
            defaultDebtDueDays: true,
            businessModeOverride: true,
            enableFulfillmentTypes: true,
            enableRestaurantFeatures: true,
            enableTableService: true,
            enableDeliveryDetails: true,
            enableProductModifiers: true,
            isDefaultTerminal: true,
            validUntil: true,
            isTrainMode: true,
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
            subscription: {
              select: {
                status: true,
                expiresAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!timestamp) return { success: true as const, data: null };

    const platformBillingMode = await getPlatformBillingMode();
    const billingLocked =
      !isPlatformBillingFree(platformBillingMode) &&
      !isTerminalPosAccessible(timestamp.posTerminal);

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
          discountCapType: timestamp.posTerminal.discountCapType,
          discountMax: timestamp.posTerminal.discountMax
            ? Number(timestamp.posTerminal.discountMax)
            : 0,
          allowCashierDebtCreate: timestamp.posTerminal.allowCashierDebtCreate,
          allowCashierDebtCollect:
            timestamp.posTerminal.allowCashierDebtCollect,
          requireManagerApprovalForDebt:
            timestamp.posTerminal.requireManagerApprovalForDebt,
          pinlessModeEnabled: timestamp.posTerminal.pinlessModeEnabled,
          defaultDebtDueDays: timestamp.posTerminal.defaultDebtDueDays ?? null,
          businessMode: timestamp.posTerminal.businessModeOverride ?? "RETAIL",
          enableFulfillmentTypes: timestamp.posTerminal.enableFulfillmentTypes,
          enableRestaurantFeatures:
            timestamp.posTerminal.enableRestaurantFeatures,
          enableTableService: timestamp.posTerminal.enableTableService,
          enableDeliveryDetails: timestamp.posTerminal.enableDeliveryDetails,
          enableProductModifiers: timestamp.posTerminal.enableProductModifiers,
          printerConfig: printConfigService.mapPrinterConfig(
            timestamp.posTerminal,
          ),
          billingLocked,
          billingMessage: billingLocked
            ? TERMINAL_BILLING_TRANSACTION_RESTRICTION_MESSAGE
            : null,
        },
        user: { name: profile.fullName || null, role: profile.role },
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(
        error,
        "Unable to load the current POS session.",
      ),
    };
  }
}

export async function getTerminalsAction() {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return {
        success: false as const,
        error: "No company associated with user.",
      };
    }
    if (profile.role === "cashier" && !profile.branchId) {
      return {
        success: false as const,
        error: "No branch assigned. Please contact your manager.",
      };
    }

    const terminals = await prisma.posTerminalInfo.findMany({
      where: {
        companyId: profile.companyId,
        ...(profile.role === "cashier" ? { branchId: profile.branchId } : {}),
      },
      select: {
        id: true,
        posName: true,
        vat: true,
        discountCapType: true,
        discountMax: true,
        allowCashierDebtCreate: true,
        allowCashierDebtCollect: true,
        requireManagerApprovalForDebt: true,
        pinlessModeEnabled: true,
        defaultDebtDueDays: true,
        businessModeOverride: true,
        enableFulfillmentTypes: true,
        enableRestaurantFeatures: true,
        enableTableService: true,
        enableDeliveryDetails: true,
        enableProductModifiers: true,
        isDefaultTerminal: true,
        validUntil: true,
        isTrainMode: true,
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
        subscription: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
        timestamps: {
          where: { timestampOut: null },
          select: {
            cashier: {
              select: { fullName: true },
            },
          },
        },
      },
      orderBy: { posName: "asc" },
    });

    const platformBillingMode = await getPlatformBillingMode();

    return {
      success: true as const,
      data: terminals.map((terminal) => {
        const billing = getTerminalBillingSummary(
          terminal.subscription,
          terminal.isDefaultTerminal,
          terminal.validUntil,
          platformBillingMode,
        );

        return {
          id: terminal.id,
          posName: terminal.posName ?? "Unnamed terminal",
          isActive: terminal.timestamps.length > 0,
          billingLocked:
            !isPlatformBillingFree(platformBillingMode) &&
            !isTerminalPosAccessible(terminal),
          billingMessage: billing.message,
          statusLabel: billing.statusLabel,
          statusTone: billing.statusTone,
          actionLabel: billing.actionLabel,
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
          sessions: terminal.timestamps.map((timestamp) => ({
            profile: {
              fullName: timestamp.cashier.fullName ?? null,
            },
          })),
        };
      }),
    };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Failed to fetch terminals."),
    };
  }
}

export async function openSessionAction(
  terminalId: string,
  managerPin: string,
  openingCash: number = 0,
  deviceId: string | null = null,
  idempotencyKey: string = randomUUID(),
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return {
        success: false as const,
        error: "No company associated with user.",
      };
    }
    if (profile.role === "cashier" && !profile.branchId) {
      return {
        success: false as const,
        error: "No branch assigned. Please contact your manager.",
      };
    }
    await assertTerminalBillingAllowsPos(profile.companyId, terminalId);

    const terminal = await prisma.posTerminalInfo.findFirst({
      where: { id: terminalId, companyId: profile.companyId },
      select: { pinlessModeEnabled: true },
    });

    if (!terminal) {
      return { success: false as const, error: "Terminal not found." };
    }

    if (!terminal.pinlessModeEnabled) {
      if (!managerPin.trim()) {
        return { success: false as const, error: "Manager PIN is required." };
      }

      await enforceRateLimit({
        bucket: "managerPin",
        route: "/pos",
        action: "OPEN_SESSION_PIN",
        profileId: profile.id,
        userId: profile.id,
        role: profile.role,
        companyId: profile.companyId,
        terminalId,
      });
    }

    return await sessionMutationService.openSession(
      {
        profileId: profile.id,
        companyId: profile.companyId,
        role: profile.role,
        fullName: profile.fullName ?? null,
        branchId: profile.branchId ?? null,
      },
      terminalId,
      managerPin,
      openingCash,
      deviceId,
      idempotencyKey,
    );
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Unable to open the POS session."),
    };
  }
}

export async function withdrawCashAction(
  timestampId: string,
  amount: number,
  managerPin: string,
  reason: string,
  idempotencyKey: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return { success: false, error: "No company associated with user." };
    }
    await enforceRateLimit({
      bucket: "sensitivePosAction",
      route: "/pos",
      action: "WITHDRAW_CASH",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
    });

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }
    const normalizedReason = reason.trim();
    if (!normalizedReason || normalizedReason.length > 200) {
      return {
        success: false,
        error: "Withdrawal reason is required and must be 200 characters or fewer.",
      };
    }

    const timestamp = await prisma.timestamp.findFirst({
      where: { id: timestampId, cashierId: profile.id },
      select: {
        posTerminal: {
          select: { pinlessModeEnabled: true },
        },
      },
    });
    const pinlessModeEnabled =
      timestamp?.posTerminal.pinlessModeEnabled === true;

    let approverProfileId: string | null = null;

    if (!pinlessModeEnabled) {
      await enforceRateLimit({
        bucket: "managerPin",
        route: "/pos",
        action: "WITHDRAW_CASH_PIN",
        profileId: profile.id,
        userId: profile.id,
        role: profile.role,
        companyId: profile.companyId,
        terminalId: timestampId,
      });

      const approver = await findProfileByPin({
        companyId: profile.companyId,
        pin: managerPin,
        roles: ["manager", "admin"],
        select: { id: true, status: true },
      });

      if (!approver || approver.status !== "active") {
        return { success: false, error: "Invalid Manager PIN" };
      }

      approverProfileId = approver.id as string;
    }

    await sessionMutationService.withdrawCashAuthorized(
      {
        profileId: profile.id,
        companyId: profile.companyId,
        role: profile.role,
        fullName: profile.fullName ?? null,
        branchId: profile.branchId ?? null,
      },
      timestampId,
      amount,
      approverProfileId,
      normalizedReason,
      idempotencyKey,
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Unable to record cash withdrawal."),
    };
  }
}

export async function closeSessionAction(
  sessionId: string,
  timestampId: string,
  countedCash: number,
  managerPin: string,
  idempotencyKey: string = randomUUID(),
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return {
        success: false as const,
        error: "No company associated with user.",
      };
    }
    await enforceRateLimit({
      bucket: "sensitivePosAction",
      route: "/pos",
      action: "CLOSE_SESSION",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId: profile.companyId,
    });

    const timestamp = await prisma.timestamp.findFirst({
      where: { id: timestampId, cashierId: profile.id },
      select: {
        posTerminal: {
          select: { pinlessModeEnabled: true },
        },
      },
    });
    const pinlessModeEnabled =
      timestamp?.posTerminal.pinlessModeEnabled === true;

    let approverProfileId: string | null = null;

    if (!pinlessModeEnabled) {
      await enforceRateLimit({
        bucket: "managerPin",
        route: "/pos",
        action: "CLOSE_SESSION_PIN",
        profileId: profile.id,
        userId: profile.id,
        role: profile.role,
        companyId: profile.companyId,
        terminalId: timestampId,
      });

      const approver = await findProfileByPin({
        companyId: profile.companyId,
        pin: managerPin,
        roles: ["manager", "admin"],
        select: { id: true, status: true },
      });

      if (!approver || approver.status !== "active") {
        return { success: false as const, error: "Invalid Manager PIN" };
      }

      approverProfileId = approver.id as string;
    }

    const data = await sessionMutationService.closeSessionAuthorized(
      {
        profileId: profile.id,
        companyId: profile.companyId,
        role: profile.role,
        fullName: profile.fullName ?? null,
        branchId: profile.branchId ?? null,
      },
      sessionId,
      timestampId,
      countedCash,
      approverProfileId,
      idempotencyKey,
    );

    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: toSafeActionError(error, "Unable to close the POS session."),
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
      error: toSafeActionError(error, "Unable to load session cash tracking."),
    };
  }
}

export async function getSessionXReadingPrintPayloadAction(
  timestampId: string,
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile.companyId) {
      return {
        success: false as const,
        error: "No company associated with user.",
      };
    }

    const payload =
      await sessionMutationService.getSessionXReadingPayload(timestampId);

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
      error: toSafeActionError(
        error,
        "Unable to build X-reading print payload.",
      ),
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
      error: toSafeActionError(error, "Unable to load available cash."),
    };
  }
}
