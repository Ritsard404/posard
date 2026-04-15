import { prisma } from "@/lib/prisma";
import {
  type TerminalSubscriptionDTO,
  type UpsertTerminalSubscriptionInput,
} from "./subscription.dto";
import { withOptionalCompanyTable } from "./company-schema-guard.service";

function mapSubscription(subscription: {
  id: string;
  terminalId: string;
  billingCycle: "monthly" | "quarterly" | "annually";
  status: "pending" | "active" | "expired" | "suspended" | "cancelled";
  startsAt: Date | null;
  expiresAt: Date | null;
  renewedAt: Date | null;
  autoRenew: boolean;
  price: { toNumber(): number } | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  terminal: {
    id: string;
    posName: string;
    registeredName: string;
    isActive: boolean;
    isTrainMode: boolean;
  };
}): TerminalSubscriptionDTO {
  return {
    id: subscription.id,
    terminalId: subscription.terminalId,
    billingCycle: subscription.billingCycle,
    status: subscription.status,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    renewedAt: subscription.renewedAt,
    autoRenew: subscription.autoRenew,
    price: subscription.price ? subscription.price.toNumber() : null,
    notes: subscription.notes,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    terminal: subscription.terminal,
  };
}

export const subscriptionService = {
  async getSubscriptionsByCompany(companyId: string): Promise<TerminalSubscriptionDTO[]> {
    const subscriptions = await withOptionalCompanyTable(
      () =>
        prisma.terminalSubscription.findMany({
          where: {
            terminal: {
              companyId,
            },
          },
          include: {
            terminal: {
              select: {
                id: true,
                posName: true,
                registeredName: true,
                isActive: true,
                isTrainMode: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        }),
      [],
      "public.terminal_subscription",
    );

    return subscriptions.map(mapSubscription);
  },

  async getSubscriptionByTerminal(
    companyId: string,
    terminalId: string,
  ): Promise<TerminalSubscriptionDTO | null> {
    const subscription = await prisma.terminalSubscription.findFirst({
      where: {
        terminalId,
        terminal: {
          companyId,
        },
      },
      include: {
        terminal: {
          select: {
            id: true,
            posName: true,
            registeredName: true,
            isActive: true,
            isTrainMode: true,
          },
        },
      },
    });

    return subscription ? mapSubscription(subscription) : null;
  },

  async upsertSubscription(
    companyId: string,
    terminalId: string,
    payload: UpsertTerminalSubscriptionInput,
  ): Promise<TerminalSubscriptionDTO> {
    const terminal = await prisma.posTerminalInfo.findFirst({
      where: {
        id: terminalId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const normalizedStatus =
      payload.status === "active" &&
      payload.expiresAt &&
      payload.expiresAt < new Date()
        ? "expired"
        : payload.status;

    const subscription = await prisma.terminalSubscription.upsert({
      where: {
        terminalId,
      },
      create: {
        terminalId,
        billingCycle: payload.billingCycle,
        status: normalizedStatus,
        startsAt: payload.startsAt ?? null,
        expiresAt: payload.expiresAt ?? null,
        renewedAt: payload.renewedAt ?? null,
        autoRenew: payload.autoRenew,
        price: payload.price ?? null,
        notes: payload.notes ?? null,
      },
      update: {
        billingCycle: payload.billingCycle,
        status: normalizedStatus,
        startsAt: payload.startsAt ?? null,
        expiresAt: payload.expiresAt ?? null,
        renewedAt: payload.renewedAt ?? null,
        autoRenew: payload.autoRenew,
        price: payload.price ?? null,
        notes: payload.notes ?? null,
      },
      include: {
        terminal: {
          select: {
            id: true,
            posName: true,
            registeredName: true,
            isActive: true,
            isTrainMode: true,
          },
        },
      },
    });

    return mapSubscription(subscription);
  },

  async cancelSubscription(
    companyId: string,
    terminalId: string,
  ): Promise<TerminalSubscriptionDTO> {
    const terminal = await prisma.posTerminalInfo.findFirst({
      where: {
        id: terminalId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!terminal) {
      throw new Error("Terminal not found");
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.terminalSubscription.update({
        where: {
          terminalId,
        },
        data: {
          status: "cancelled",
          autoRenew: false,
        },
        include: {
          terminal: {
            select: {
              id: true,
              posName: true,
              registeredName: true,
              isActive: true,
              isTrainMode: true,
            },
          },
        },
      });

      await tx.posTerminalInfo.update({
        where: { id: terminalId },
        data: {
          isActive: false,
        },
      });

      return updatedSubscription;
    });

    return mapSubscription(subscription);
  },
};
