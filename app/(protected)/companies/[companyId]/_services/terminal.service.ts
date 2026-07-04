import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasCoverageDatePassed, isTerminalPosAccessible } from "@/lib/billing-access";
import {
  type TerminalDTO,
  type CreateTerminalInput,
  type UpdateTerminalInput,
  type TerminalConfigurationInput,
  type SetTerminalActiveInput,
} from "./terminal.dto";
import { printConfigService } from "@/app/(protected)/pos/_services/print-config.service";

type TerminalRecord = Prisma.PosTerminalInfoGetPayload<{
  include: {
    company: { select: { name: true } };
    branch: { select: { name: true } };
    subscription: { select: { status: true; expiresAt: true } };
    sessions: {
      where: { isActive: true };
      take: 1;
      orderBy: { loginTime: "desc" };
      select: { profile: { select: { fullName: true; email: true } } };
    };
  };
}>;

type BillingStatusTone = "success" | "warning" | "danger" | "neutral";

function getTerminalBillingSnapshot(
  subscription: TerminalRecord["subscription"],
  isDefaultTerminal: boolean,
  validUntil: Date,
): {
  billingStatusLabel: string;
  billingStatusTone: BillingStatusTone;
  billingStatusReason: string;
  billingActionLabel: string;
} {
  if (!subscription) {
    if (isDefaultTerminal) {
      return {
        billingStatusLabel: "Available",
        billingStatusTone: "success",
        billingStatusReason: "Default terminal access remains available.",
        billingActionLabel: "Included terminal",
      };
    }

    return {
      billingStatusLabel: "Subscription required",
      billingStatusTone: "danger",
      billingStatusReason: "No active subscription is attached to this terminal.",
      billingActionLabel: "Subscribe now",
    };
  }

  if (hasCoverageDatePassed(validUntil)) {
    return {
      billingStatusLabel: "Expired",
      billingStatusTone: "danger",
      billingStatusReason: `Terminal validity ended on ${validUntil.toLocaleDateString()}.`,
      billingActionLabel: "Renew now",
    };
  }

  if (
    subscription.status === "active" &&
    !hasCoverageDatePassed(subscription.expiresAt, false)
  ) {
    return {
      billingStatusLabel: subscription.expiresAt ? "Active plan" : "Active open plan",
      billingStatusTone: "success",
      billingStatusReason: subscription.expiresAt
        ? `Covered until ${subscription.expiresAt.toLocaleDateString()}.`
        : "Subscription is active with no expiry date set.",
      billingActionLabel: subscription.expiresAt ? "Monitor renewal" : "Review billing setup",
    };
  }

  if (subscription.status === "pending") {
    return {
      billingStatusLabel: "Pending payment",
      billingStatusTone: "warning",
      billingStatusReason: "Subscription is recorded but still waiting for activation or payment confirmation.",
      billingActionLabel: "Collect payment",
    };
  }

  if (subscription.status === "suspended") {
    return {
      billingStatusLabel: "Suspended",
      billingStatusTone: "danger",
      billingStatusReason: "POS access is locked until the billing issue is settled.",
      billingActionLabel: "Settle balance",
    };
  }

  if (subscription.status === "cancelled") {
    return {
      billingStatusLabel: "Cancelled",
      billingStatusTone: "danger",
      billingStatusReason: "This terminal needs a restored plan before billing protection is cleared.",
      billingActionLabel: "Restore plan",
    };
  }

  return {
    billingStatusLabel: "Expired",
    billingStatusTone: "danger",
    billingStatusReason: subscription.expiresAt
      ? `Coverage ended on ${subscription.expiresAt.toLocaleDateString()}.`
      : "Subscription is no longer active for this terminal.",
    billingActionLabel: "Renew now",
  };
}

function mapTerminal(terminal: TerminalRecord): TerminalDTO {
  const activeSession = terminal.sessions?.[0];
  const billingSnapshot = getTerminalBillingSnapshot(
    terminal.subscription,
    terminal.isDefaultTerminal,
    terminal.validUntil,
  );

  return {
    ...terminal,
    printerConfig: printConfigService.mapPrinterConfig(terminal),
    discountCapType: terminal.discountCapType,
    discountMax: terminal.discountMax?.toNumber() ?? null,
    allowCashierDebtCreate: terminal.allowCashierDebtCreate,
    allowCashierDebtCollect: terminal.allowCashierDebtCollect,
    requireManagerApprovalForDebt: terminal.requireManagerApprovalForDebt,
    defaultDebtDueDays: terminal.defaultDebtDueDays ?? null,
    businessModeOverride: terminal.businessModeOverride ?? null,
    businessTypePresetOverride: terminal.businessTypePresetOverride ?? null,
    enableFulfillmentTypes: terminal.enableFulfillmentTypes,
    enableRestaurantFeatures: terminal.enableRestaurantFeatures,
    enableTableService: terminal.enableTableService,
    enableDeliveryDetails: terminal.enableDeliveryDetails,
    enableProductModifiers: terminal.enableProductModifiers,
    enableKitchenTickets: terminal.enableKitchenTickets,
    companyName: terminal.company?.name ?? null,
    branchId: terminal.branchId,
    branchName: terminal.branch?.name ?? null,
    subscriptionStatus: terminal.subscription?.status ?? null,
    subscriptionExpiresAt: terminal.subscription?.expiresAt ?? null,
    billingStatusLabel: billingSnapshot.billingStatusLabel,
    billingStatusTone: billingSnapshot.billingStatusTone,
    billingStatusReason: billingSnapshot.billingStatusReason,
    billingActionLabel: billingSnapshot.billingActionLabel,
    assignedUserName: activeSession?.profile.fullName ?? activeSession?.profile.email ?? null,
    isInUse: Boolean(activeSession),
  };
}

function normalizeVatRegistration<T extends { vat?: number | null; vatTinNumber?: string | null }>(
  payload: T,
): T {
  if (payload.vat === undefined) {
    return payload;
  }

  const vat = payload.vat && payload.vat > 0 ? 12 : 0;

  return {
    ...payload,
    vat,
    vatTinNumber: vat > 0 ? payload.vatTinNumber ?? null : null,
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
        branch: {
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
        branch: {
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
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        address: true,
        _count: {
          select: {
            posTerminals: true,
          },
        },
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    const nextTerminalNumber = company._count.posTerminals + 1;
    const branchId = payload.branchId ?? null;

    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, companyId, isActive: true },
        select: { id: true },
      });

      if (!branch) {
        throw new Error("Branch not found");
      }
    }

    const terminal = await prisma.posTerminalInfo.create({
      data: {
        ...normalizeVatRegistration(payload),
        companyId,
        branchId,
        posName: `${company.name} POS ${nextTerminalNumber}`,
        registeredName: company.name,
        address: company.address,
        isDefaultTerminal: false,
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
    if (payload.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: payload.branchId, companyId, isActive: true },
        select: { id: true },
      });

      if (!branch) {
        throw new Error("Branch not found");
      }
    }

    const terminal = await prisma.posTerminalInfo.update({
      where: { id },
      data: {
        ...normalizeVatRegistration(payload),
        branchId: payload.branchId ?? null,
      },
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
        ...normalizeVatRegistration({
          vat: payload.vat,
          vatTinNumber: payload.vatTinNumber,
        }),
        discountCapType: payload.discountCapType,
        discountMax: payload.discountMax,
        allowCashierDebtCreate: payload.allowCashierDebtCreate,
        allowCashierDebtCollect: payload.allowCashierDebtCollect,
        requireManagerApprovalForDebt: payload.requireManagerApprovalForDebt,
        defaultDebtDueDays: payload.defaultDebtDueDays,
        businessModeOverride: payload.businessModeOverride ?? null,
        businessTypePresetOverride: payload.businessTypePresetOverride ?? null,
        enableFulfillmentTypes: payload.enableFulfillmentTypes,
        enableRestaurantFeatures: payload.enableRestaurantFeatures,
        enableTableService: payload.enableTableService,
        enableDeliveryDetails: payload.enableDeliveryDetails,
        enableProductModifiers: payload.enableProductModifiers,
        enableKitchenTickets: payload.enableKitchenTickets,
        printerName:
          payload.printerConfig?.displayName?.trim() ||
          (payload.printerName ?? null),
        printerDisplayName: payload.printerConfig?.displayName ?? null,
        printerConnectionType: (payload.printerConfig?.connectionType ?? null) as never,
        printerTransport: (
          payload.printerConfig?.transport === "built-in"
            ? "built_in"
            : (payload.printerConfig?.transport ?? null)
        ) as never,
        printerDriver: (payload.printerConfig?.driver?.replace("-", "_") ?? null) as never,
        printerVendorId: payload.printerConfig?.vendorId ?? null,
        printerProductId: payload.printerConfig?.productId ?? null,
        printerDeviceId: payload.printerConfig?.deviceId ?? null,
        printerServiceUuid: payload.printerConfig?.serviceUuid ?? null,
        printerCharacteristicUuid:
          payload.printerConfig?.characteristicUuid ?? null,
        autoPrintEnabled: payload.printerConfig?.autoPrintEnabled ?? true,
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
        isDefaultTerminal: true,
        validUntil: true,
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
      if (!isTerminalPosAccessible(terminal)) {
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
