import { expect, test } from "@playwright/test";

import { syncActionsRequestSchema } from "../../app/(protected)/pos/_services/_validators/offline-sync.schema";
import { prisma } from "../../lib/prisma";
import {
  authenticatePageWithCredentials,
  cashierCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from "../fixtures/auth.fixture";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

function buildQueuedSale(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();

  return {
    localId: "local-sale-1",
    type: "PAY_ORDER",
    idempotencyKey: "client-txn-1",
    timestampId: "timestamp-1",
    terminalId: "terminal-1",
    deviceId: "device-1",
    cashierId: "cashier-1",
    companyId: "company-1",
    createdAtLocal: now,
    syncStatus: "pending",
    retryCount: 0,
    nextRetryAt: null,
    lastError: null,
    syncedAt: null,
    payload: {
      order: {
        timestampId: "timestamp-1",
        deviceId: "device-1",
        idempotencyKey: "client-txn-1",
        localInvoiceNo: "OFF-TERM-20260505-0001",
        items: [
          {
            productId: "product-1",
            qty: 1,
            price: 100,
            subTotal: 100,
            status: "PAID",
          },
        ],
        cashTenderAmount: 100,
        settlementMode: "pay_now",
      },
      invoiceNoLocal: "OFF-TERM-20260505-0001",
      stockSnapshotVersion: "snapshot-1",
      receipt: {
        id: "local-receipt-1",
        invoiceNumber: 0,
        localInvoiceNo: "OFF-TERM-20260505-0001",
        isProvisional: true,
        syncStatus: "pending",
        syncError: null,
        createdAt: now,
      },
    },
    ...overrides,
  };
}

test.describe("local-first POS sync payload @offline", () => {
  test("accepts a queued local sale with a client transaction id and receipt snapshot", () => {
    const parsed = syncActionsRequestSchema.safeParse({
      actions: [buildQueuedSale()],
    });

    expect(parsed.success).toBe(true);
  });

  test("rejects a queued sale without an idempotency key", () => {
    const parsed = syncActionsRequestSchema.safeParse({
      actions: [buildQueuedSale({ idempotencyKey: "" })],
    });

    expect(parsed.success).toBe(false);
  });

  test("replays once and persists stock, approval, and closed-session conflicts", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    assertE2EDatabaseWritesAllowed();
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let managerAuth: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let categoryId: string | null = null;
    let productId: string | null = null;
    let terminalId: string | null = null;
    let timestampId: string | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      managerAuth = await ensureAuthUserForProfile(managerCredentials);
      const [cashier, manager] = await Promise.all([
        prisma.profile.findUniqueOrThrow({
          where: { email: cashierCredentials.email },
          select: { id: true, branchId: true },
        }),
        prisma.profile.findUniqueOrThrow({
          where: { email: managerCredentials.email },
          select: { id: true },
        }),
      ]);
      const category = await prisma.category.create({
        data: {
          companyId: profiles.companyId,
          categoryName: `E2E OFFLINE ${suffix}`,
        },
        select: { id: true },
      });
      categoryId = category.id;
      const product = await prisma.product.create({
        data: {
          companyId: profiles.companyId,
          categoryId,
          name: `E2E Offline Product ${suffix}`,
          barcode: `OFF-${suffix}`,
          baseUnit: "PCS",
          quantity: 5,
          cost: 40,
          price: 100,
          trackInventory: true,
          isAvailable: true,
          itemType: "RESALE",
          vatType: "VATABLE",
        },
        select: { id: true },
      });
      productId = product.id;
      const terminal = await prisma.posTerminalInfo.create({
        data: {
          companyId: profiles.companyId,
          minNumber: `MIN-OFF-${suffix}`,
          accreditationNumber: `ACC-OFF-${suffix}`,
          ptuNumber: `PTU-OFF-${suffix}`,
          dateIssued: new Date("2024-01-01"),
          validUntil: new Date("2035-01-01"),
          posName: `E2E Offline Terminal ${suffix}`,
          registeredName: "E2E Offline",
          operatedBy: "E2E Offline",
          address: "E2E Test Address",
          vatTinNumber: `TIN-OFF-${suffix}`,
          vat: 12,
          isActive: true,
          branchId: cashier.branchId,
        },
        select: { id: true },
      });
      terminalId = terminal.id;
      const timestamp = await prisma.timestamp.create({
        data: {
          posTerminalId: terminalId,
          cashierId: cashier.id,
          managerInId: manager.id,
          timestampIn: new Date(),
          cashInDrawerAmount: 500,
          deviceId: `offline-device-${suffix}`,
        },
        select: { id: true },
      });
      timestampId = timestamp.id;
      await authenticatePageWithCredentials(page, cashierCredentials);

      const action = buildQueuedSale({
        localId: `offline-sale-${suffix}`,
        idempotencyKey: `offline-txn-${suffix}`,
        timestampId,
        terminalId,
        deviceId: `offline-device-${suffix}`,
        cashierId: cashier.id,
        companyId: profiles.companyId,
        payload: {
          order: {
            timestampId,
            deviceId: `offline-device-${suffix}`,
            idempotencyKey: `offline-txn-${suffix}`,
            localInvoiceNo: `OFF-${suffix}-0001`,
            items: [
              { productId, qty: 1, price: 100, subTotal: 100, status: "PAID" },
            ],
            cashTenderAmount: 100,
            settlementMode: "pay_now",
          },
          invoiceNoLocal: `OFF-${suffix}-0001`,
          stockSnapshotVersion: `snapshot-${suffix}`,
          receipt: {
            id: `offline-receipt-${suffix}`,
            invoiceNumber: 0,
            localInvoiceNo: `OFF-${suffix}-0001`,
            isProvisional: true,
            syncStatus: "pending",
            syncError: null,
            createdAt: new Date().toISOString(),
          },
        },
      });

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await page.request.post("/api/sync/actions", {
          data: { actions: [action] },
        });
        const body = await response.json();
        expect(response.status(), JSON.stringify(body)).toBe(200);
        expect(body.data.results[0].syncStatus).toBe("synced");
      }
      expect(
        await prisma.invoice.count({
          where: { idempotencyKey: `offline-txn-${suffix}` },
        }),
      ).toBe(1);
      expect(
        Number(
          (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
            .quantity,
        ),
      ).toBe(4);

      await prisma.product.update({
        where: { id: productId },
        data: { quantity: 1 },
      });
      const concurrentActions = ["a", "b"].map((label) => ({
        ...action,
        localId: `offline-race-${label}-${suffix}`,
        idempotencyKey: `offline-race-${label}-txn-${suffix}`,
        payload: {
          ...action.payload,
          order: {
            ...action.payload.order,
            idempotencyKey: `offline-race-${label}-txn-${suffix}`,
            localInvoiceNo: `OFF-${suffix}-RACE-${label}`,
          },
          invoiceNoLocal: `OFF-${suffix}-RACE-${label}`,
        },
      }));
      const raceResponses = await Promise.all(
        concurrentActions.map((raceAction) =>
          page.request.post("/api/sync/actions", {
            data: { actions: [raceAction] },
          }),
        ),
      );
      const raceResults = await Promise.all(
        raceResponses.map(async (response) => {
          expect(response.status()).toBe(200);
          return (await response.json()).data.results[0] as {
            syncStatus: string;
            error?: string;
          };
        }),
      );
      const raceStatuses = raceResults.map((result) => result.syncStatus);
      expect(raceStatuses.sort()).toEqual(["failed", "synced"]);
      expect(
        raceResults.find((result) => result.syncStatus === "failed")?.error,
      ).toContain("Insufficient stock");
      expect(
        await prisma.invoice.count({ where: { posTerminalId: terminalId } }),
      ).toBe(2);
      expect(
        Number(
          (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
            .quantity,
        ),
      ).toBe(0);

      const staleStockAction = {
        ...action,
        localId: `offline-stock-${suffix}`,
        idempotencyKey: `offline-stock-txn-${suffix}`,
        payload: {
          ...action.payload,
          order: {
            ...action.payload.order,
            idempotencyKey: `offline-stock-txn-${suffix}`,
            localInvoiceNo: `OFF-${suffix}-0002`,
            items: [
              {
                productId,
                qty: 99,
                price: 100,
                subTotal: 9900,
                status: "PAID",
              },
            ],
            cashTenderAmount: 9900,
          },
          invoiceNoLocal: `OFF-${suffix}-0002`,
        },
      };
      const closeAction = {
        localId: `offline-close-${suffix}`,
        type: "CLOSE_SESSION",
        idempotencyKey: `offline-close-txn-${suffix}`,
        timestampId,
        terminalId,
        deviceId: `offline-device-${suffix}`,
        cashierId: cashier.id,
        companyId: profiles.companyId,
        createdAtLocal: new Date().toISOString(),
        syncStatus: "pending",
        retryCount: 0,
        nextRetryAt: null,
        lastError: null,
        syncedAt: null,
        payload: { sessionId: timestampId, countedCash: 500 },
      };
      const conflictResponse = await page.request.post("/api/sync/actions", {
        data: { actions: [staleStockAction, closeAction] },
      });
      expect(conflictResponse.status()).toBe(200);
      const conflictResults = (await conflictResponse.json()).data.results;
      expect(
        conflictResults.map(
          (result: { syncStatus: string }) => result.syncStatus,
        ),
      ).toEqual(["failed", "needs_review"]);

      await prisma.timestamp.update({
        where: { id: timestampId },
        data: { timestampOut: new Date() },
      });
      const closedSessionAction = {
        ...action,
        localId: `offline-closed-${suffix}`,
        idempotencyKey: `offline-closed-txn-${suffix}`,
      };
      const closedResponse = await page.request.post("/api/sync/actions", {
        data: { actions: [closedSessionAction] },
      });
      const closedResult = (await closedResponse.json()).data.results[0];
      expect(closedResult.syncStatus).toBe("needs_review");

      const issues = await prisma.offlineSyncIssue.findMany({
        where: { companyId: profiles.companyId },
        orderBy: { localId: "asc" },
      });
      expect(issues).toHaveLength(4);
      expect(new Set(issues.map((issue) => issue.conflictCategory))).toEqual(
        new Set(["inventory", "manager_approval", "session_recovery"]),
      );
      expect(
        await prisma.invoice.count({ where: { posTerminalId: terminalId } }),
      ).toBe(2);
      expect(
        Number(
          (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
            .quantity,
        ),
      ).toBe(0);

      await authenticatePageWithCredentials(page, managerCredentials);
      await page.goto("/sync");
      await expect(page.getByRole("heading", { name: /Sync/i }).first()).toBeVisible();
      await expect(page.getByRole("cell", { name: `offline-stock-txn-${suffix}` })).toBeVisible();
      await expect(page.getByRole("cell", { name: /Insufficient stock/i }).first()).toBeVisible();
      await expect(page.getByRole("cell", { name: `offline-close-txn-${suffix}` })).toBeVisible();
      await expect(page.getByRole("cell", { name: /requires online manager approval review/i }).first()).toBeVisible();
    } finally {
      await prisma.offlineSyncIssue.deleteMany({
        where: { companyId: profiles.companyId },
      });
      await prisma.auditLog.deleteMany({
        where: { companyId: profiles.companyId },
      });
      await prisma.stockMovement.deleteMany({
        where: { companyId: profiles.companyId },
      });
      if (productId)
        await prisma.inventory.deleteMany({ where: { productId } });
      if (terminalId)
        await prisma.invoice.deleteMany({
          where: { posTerminalId: terminalId },
        });
      if (timestampId)
        await prisma.timestamp.deleteMany({ where: { id: timestampId } });
      if (productId)
        await prisma.product.deleteMany({ where: { id: productId } });
      if (categoryId)
        await prisma.category.deleteMany({ where: { id: categoryId } });
      if (terminalId)
        await prisma.posTerminalInfo.deleteMany({ where: { id: terminalId } });
      if (authUser) await authUser.cleanup();
      if (managerAuth) await managerAuth.cleanup();
      await profiles.cleanup();
    }
  });
});
