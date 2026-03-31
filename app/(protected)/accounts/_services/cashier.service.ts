import "server-only";
import { prisma } from "@/lib/prisma";
import type { DrawerStateDto } from "./member.dto";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

// ── Mock store ────────────────────────────────────────────────────────────────

let mockDrawer: DrawerStateDto = {
  cashInDrawerAmount: 0,
  cashOutDrawerAmount: 0,
  withdrawnDrawerAmount: 0,
  withdrawnDrawerCount: 0,
  isCashed: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find the open Timestamp (cashed-in, not yet cashed-out) for a cashier. */
async function findOpenTimestamp(cashierId: string) {
  return prisma.timestamp.findFirst({
    where: {
      cashierId,
      timestampIn: { not: null },
      timestampOut: null,
    },
  });
}

/** Resolve a manager Member by username. */
async function findManagerByIdentifier(identifier: string) {
  const manager = await prisma.member.findFirst({
    where: { username: identifier, memberIsDeleted: false },
    select: { id: true },
  });
  if (!manager) throw new Error(`Manager "${identifier}" not found`);
  return manager;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const cashierService = {
  /**
   * Open the drawer: record starting cash and create a Timestamp for the session.
   * @param cashierId  - current cashier's Member ID
   * @param posTerminalId - POS terminal being used
   * @param amount     - opening cash amount
   */
  async cashInDrawer(cashierId: string, posTerminalId: string, amount: number): Promise<void> {
    if (USE_MOCK) {
      await delay();
      if (mockDrawer.isCashed) throw new Error("Drawer already cashed in");
      mockDrawer = { ...mockDrawer, cashInDrawerAmount: amount, isCashed: true };
      return;
    }

    const existing = await findOpenTimestamp(cashierId);
    if (existing) throw new Error("Drawer already cashed in");

    await prisma.timestamp.create({
      data: {
        cashierId,
        posTerminalId,
        cashInDrawerAmount: amount,
        timestampIn: new Date(),
      },
    });
  },

  /**
   * Returns true when the cashier has an open drawer session.
   * @param cashierId - current cashier's Member ID
   */
  async isCashedDrawer(cashierId: string): Promise<boolean> {
    if (USE_MOCK) {
      await delay(100);
      return mockDrawer.isCashed;
    }

    const open = await findOpenTimestamp(cashierId);
    return open !== null;
  },

  /**
   * Close the drawer: record ending cash and manager sign-off.
   * @param cashierId         - current cashier's Member ID
   * @param amount            - closing cash amount
   * @param managerIdentifier - manager's username
   */
  async cashOutDrawer(cashierId: string, amount: number, managerIdentifier: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      if (!mockDrawer.isCashed) throw new Error("No open drawer session");
      if (!managerIdentifier.trim()) throw new Error("Manager identifier is required");
      mockDrawer = { ...mockDrawer, cashOutDrawerAmount: amount, isCashed: false };
      return;
    }

    const open = await findOpenTimestamp(cashierId);
    if (!open) throw new Error("No open drawer session");

    const manager = await findManagerByIdentifier(managerIdentifier);

    await prisma.timestamp.update({
      where: { id: open.id },
      data: {
        cashOutDrawerAmount: amount,
        timestampOut: new Date(),
        managerOutId: manager.id,
      },
    });
  },

  /**
   * Mid-session withdrawal with manager approval.
   * Accumulates into the running withdrawn total on the open Timestamp.
   * @param cashierId         - current cashier's Member ID
   * @param amount            - withdrawn amount
   * @param managerIdentifier - manager's username
   */
  async cashWithdrawDrawer(cashierId: string, amount: number, managerIdentifier: string): Promise<void> {
    if (USE_MOCK) {
      await delay();
      if (!mockDrawer.isCashed) throw new Error("No open drawer session");
      if (!managerIdentifier.trim()) throw new Error("Manager identifier is required");
      mockDrawer = {
        ...mockDrawer,
        withdrawnDrawerAmount: mockDrawer.withdrawnDrawerAmount + amount,
        withdrawnDrawerCount: mockDrawer.withdrawnDrawerCount + 1,
      };
      return;
    }

    const open = await findOpenTimestamp(cashierId);
    if (!open) throw new Error("No open drawer session");

    const manager = await findManagerByIdentifier(managerIdentifier);

    await prisma.timestamp.update({
      where: { id: open.id },
      data: {
        withdrawnDrawerAmount: { increment: amount },
        withdrawnDrawerCount: { increment: 1 },
        managerInId: manager.id,
      },
    });
  },

  /**
   * Read-only snapshot of the current drawer state for the UI.
   * @param cashierId - current cashier's Member ID
   */
  async drawerState(cashierId: string): Promise<DrawerStateDto> {
    if (USE_MOCK) {
      await delay(100);
      return { ...mockDrawer };
    }

    const open = await findOpenTimestamp(cashierId);
    if (!open) {
      return {
        cashInDrawerAmount: 0,
        cashOutDrawerAmount: 0,
        withdrawnDrawerAmount: 0,
        withdrawnDrawerCount: 0,
        isCashed: false,
      };
    }

    return {
      cashInDrawerAmount: Number(open.cashInDrawerAmount),
      cashOutDrawerAmount: Number(open.cashOutDrawerAmount),
      withdrawnDrawerAmount: Number(open.withdrawnDrawerAmount),
      withdrawnDrawerCount: Number(open.withdrawnDrawerCount),
      isCashed: true,
    };
  },
};
