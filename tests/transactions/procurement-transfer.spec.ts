import { expect, test, type Page } from "@playwright/test";

import { prisma } from "../../lib/prisma";
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from "../fixtures/auth.fixture";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

type ProcurementFixture = {
  companyId: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  sourceTerminalId: string;
  sourceTerminalName: string;
  destinationTerminalId: string;
  destinationTerminalName: string;
  categoryId: string;
  cleanup: () => Promise<void>;
};

async function createTerminal(companyId: string, name: string, suffix: string) {
  return prisma.posTerminalInfo.create({
    data: {
      minNumber: `MIN-${suffix}`,
      accreditationNumber: `ACC-${suffix}`,
      ptuNumber: `PTU-${suffix}`,
      dateIssued: new Date("2024-01-01"),
      validUntil: new Date("2035-01-01"),
      posName: name,
      registeredName: "E2E Procurement",
      operatedBy: "E2E Procurement",
      address: "E2E Test Address",
      vatTinNumber: `TIN-${suffix}`,
      vat: 12,
      isActive: true,
      companyId,
    },
    select: { id: true, posName: true },
  });
}

async function seedProcurementFixture(
  companyId: string,
): Promise<ProcurementFixture> {
  assertE2EDatabaseWritesAllowed();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const supplierName = `E2E Supplier ${suffix}`;
  const productName = `E2E Procurement Product ${suffix}`;
  const sourceTerminalName = `E2E Source ${suffix}`;
  const destinationTerminalName = `E2E Destination ${suffix}`;
  const category = await prisma.category.create({
    data: { companyId, categoryName: `E2E PROCUREMENT ${suffix}` },
    select: { id: true },
  });
  const [supplier, product, source, destination] = await Promise.all([
    prisma.supplier.create({
      data: { companyId, name: supplierName },
      select: { id: true },
    }),
    prisma.product.create({
      data: {
        companyId,
        categoryId: category.id,
        name: productName,
        barcode: `PROC-${suffix}`,
        baseUnit: "PCS",
        quantity: 10,
        cost: 5,
        price: 12,
        trackInventory: true,
        isAvailable: true,
        itemType: "RESALE",
        vatType: "VATABLE",
      },
      select: { id: true },
    }),
    createTerminal(companyId, sourceTerminalName, `SRC-${suffix}`),
    createTerminal(companyId, destinationTerminalName, `DST-${suffix}`),
  ]);

  return {
    companyId,
    supplierId: supplier.id,
    supplierName,
    productId: product.id,
    productName,
    sourceTerminalId: source.id,
    sourceTerminalName,
    destinationTerminalId: destination.id,
    destinationTerminalName,
    categoryId: category.id,
    async cleanup() {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.userNotification.deleteMany({ where: { companyId } });
      await prisma.stockMovement.deleteMany({ where: { companyId } });
      await prisma.stockLot.deleteMany({ where: { companyId } });
      await prisma.receivingRecord.deleteMany({ where: { companyId } });
      await prisma.purchaseOrder.deleteMany({ where: { companyId } });
      await prisma.branchTransfer.deleteMany({ where: { companyId } });
      await prisma.posTerminalInfo.deleteMany({
        where: { id: { in: [source.id, destination.id] } },
      });
      await prisma.product.deleteMany({ where: { id: product.id } });
      await prisma.category.deleteMany({ where: { id: category.id } });
      await prisma.supplier.deleteMany({ where: { id: supplier.id } });
    },
  };
}

async function openAsManager(page: Page, path: string) {
  await authenticatePageWithCredentials(page, managerCredentials);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path}(?:\\?.*)?$`));
}

async function reloadWithRetry(page: Page) {
  const url = page.url();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      return;
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Error &&
        /ERR_ABORTED|frame was detached|aborted/i.test(error.message)
      ) {
        continue;
      }
      throw error;
    }
  }
}

test.describe("procurement and transfers @transaction", () => {
  test("creates, approves, partially receives, and fully receives a purchase order", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: ProcurementFixture | null = null;

    try {
      authUser = await ensureAuthUserForProfile(managerCredentials);
      seeded = await seedProcurementFixture(profiles.companyId);
      await openAsManager(page, "/purchase-orders");

      const createForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Create PO" }),
      });
      await createForm
        .locator('select[name="supplierId"]')
        .selectOption(seeded.supplierId);
      await createForm
        .locator('select[name="productId"]')
        .selectOption(seeded.productId);
      await createForm.locator('input[name="quantity"]').fill("6");
      await createForm.locator('input[name="unitCost"]').fill("5");
      await createForm.locator('input[name="expectedAt"]').fill("2030-01-31");
      await createForm
        .locator('input[name="notes"]')
        .fill("E2E partial and full receiving");
      await createForm.getByRole("button", { name: "Create PO" }).click();

      const order = await expect
        .poll(async () =>
          prisma.purchaseOrder.findFirst({
            where: {
              companyId: seeded!.companyId,
              supplierId: seeded!.supplierId,
            },
            include: { items: true },
            orderBy: { createdAt: "desc" },
          }),
        )
        .not.toBeNull()
        .then(() =>
          prisma.purchaseOrder.findFirstOrThrow({
            where: {
              companyId: seeded!.companyId,
              supplierId: seeded!.supplierId,
            },
            include: { items: true },
            orderBy: { createdAt: "desc" },
          }),
        );
      expect(order.status).toBe("draft");
      expect(Number(order.items[0].quantity)).toBe(6);

      for (const [button, status] of [
        ["Submit", "submitted"],
        ["Approve", "approved"],
        ["Ordered", "ordered"],
      ] as const) {
        await reloadWithRetry(page);
        const row = page.getByRole("row").filter({ hasText: order.poNumber });
        await row.getByRole("button", { name: button, exact: true }).click();
        await expect
          .poll(
            async () =>
              (
                await prisma.purchaseOrder.findUniqueOrThrow({
                  where: { id: order.id },
                })
              ).status,
          )
          .toBe(status);
      }

      await reloadWithRetry(page);
      let row = page.getByRole("row").filter({ hasText: order.poNumber });
      let receiveForm = row.locator("form").filter({
        has: page.getByRole("button", { name: "Receive" }),
      });
      await receiveForm.locator('input[name="quantityReceived"]').fill("2");
      await receiveForm
        .locator('input[name="batchNumber"]')
        .fill(`BATCH-${order.poNumber}`);
      await receiveForm.locator('input[name="expiryDate"]').fill("2030-12-31");
      await receiveForm.locator('input[name="shelfLocation"]').fill("A-01");
      await receiveForm.getByRole("button", { name: "Receive" }).click();
      await expect
        .poll(
          async () =>
            (
              await prisma.purchaseOrder.findUniqueOrThrow({
                where: { id: order.id },
              })
            ).status,
        )
        .toBe("partially_received");
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productId },
            })
          ).quantity,
        ),
      ).toBe(12);

      await reloadWithRetry(page);
      row = page.getByRole("row").filter({ hasText: order.poNumber });
      receiveForm = row.locator("form").filter({
        has: page.getByRole("button", { name: "Receive" }),
      });
      await receiveForm.locator('input[name="quantityReceived"]').fill("10");
      await receiveForm
        .locator('input[name="batchNumber"]')
        .fill(`BATCH-FINAL-${order.poNumber}`);
      await receiveForm.locator('input[name="expiryDate"]').fill("2031-12-31");
      const concurrentPage = await page.context().newPage();
      await concurrentPage.goto("/purchase-orders");
      const concurrentRow = concurrentPage
        .getByRole("row")
        .filter({ hasText: order.poNumber });
      const concurrentReceiveForm = concurrentRow.locator("form").filter({
        has: concurrentPage.getByRole("button", { name: "Receive" }),
      });
      await concurrentReceiveForm
        .locator('input[name="quantityReceived"]')
        .fill("10");
      await concurrentReceiveForm
        .locator('input[name="batchNumber"]')
        .fill(`BATCH-RACE-${order.poNumber}`);
      await concurrentReceiveForm
        .locator('input[name="expiryDate"]')
        .fill("2031-12-31");
      await Promise.all([
        receiveForm.getByRole("button", { name: "Receive" }).click(),
        concurrentReceiveForm.getByRole("button", { name: "Receive" }).click(),
      ]);
      await expect
        .poll(
          async () =>
            (
              await prisma.purchaseOrder.findUniqueOrThrow({
                where: { id: order.id },
              })
            ).status,
        )
        .toBe("fully_received");
      await concurrentPage.close();

      const finalOrder = await prisma.purchaseOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: true,
          receivingRecords: { include: { items: true } },
        },
      });
      expect(Number(finalOrder.items[0].receivedQuantity)).toBe(6);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productId },
            })
          ).quantity,
        ),
      ).toBe(16);
      expect(finalOrder.receivingRecords).toHaveLength(2);
      expect(
        finalOrder.receivingRecords
          .flatMap((record) => record.items)
          .map((item) => Number(item.quantityReceived)),
      ).toEqual([2, 4]);
      expect(
        finalOrder.receivingRecords
          .flatMap((record) => record.items)
          .map((item) => Number(item.varianceQuantity)),
      ).toEqual([0, 6]);
      expect(
        await prisma.stockLot.count({
          where: { companyId: seeded.companyId, productId: seeded.productId },
        }),
      ).toBe(2);
      expect(
        await prisma.stockMovement.count({
          where: {
            companyId: seeded.companyId,
            productId: seeded.productId,
            movementType: "stock_in",
          },
        }),
      ).toBe(2);
      expect(
        await prisma.auditLog.count({
          where: {
            referenceId: order.id,
            actionType: { startsWith: "purchase_order_" },
          },
        }),
      ).toBe(6);

      await reloadWithRetry(page);
      const cancelForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Create PO" }),
      });
      await cancelForm
        .locator('select[name="supplierId"]')
        .selectOption(seeded.supplierId);
      await cancelForm
        .locator('select[name="productId"]')
        .selectOption(seeded.productId);
      await cancelForm.locator('input[name="quantity"]').fill("1");
      await cancelForm.locator('input[name="unitCost"]').fill("5");
      await cancelForm.getByRole("button", { name: "Create PO" }).click();
      const cancelledOrder = await expect
        .poll(async () =>
          prisma.purchaseOrder.findFirst({
            where: { companyId: seeded!.companyId, id: { not: order.id } },
            orderBy: { createdAt: "desc" },
          }),
        )
        .not.toBeNull()
        .then(() =>
          prisma.purchaseOrder.findFirstOrThrow({
            where: { companyId: seeded!.companyId, id: { not: order.id } },
            orderBy: { createdAt: "desc" },
          }),
        );
      await reloadWithRetry(page);
      await page
        .getByRole("row")
        .filter({ hasText: cancelledOrder.poNumber })
        .getByRole("button", { name: "Cancel" })
        .click();
      await expect
        .poll(
          async () =>
            (
              await prisma.purchaseOrder.findUniqueOrThrow({
                where: { id: cancelledOrder.id },
              })
            ).status,
        )
        .toBe("cancelled");
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productId },
            })
          ).quantity,
        ),
      ).toBe(16);
    } finally {
      try {
        await seeded?.cleanup();
      } finally {
        try {
          await authUser?.cleanup();
        } finally {
          await profiles.cleanup();
        }
      }
    }
  });

  test("dispatches and fully receives a branch transfer exactly once", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: ProcurementFixture | null = null;

    try {
      authUser = await ensureAuthUserForProfile(managerCredentials);
      seeded = await seedProcurementFixture(profiles.companyId);
      await openAsManager(page, "/transfers");
      const createForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Request Transfer" }),
      });
      await createForm
        .locator('select[name="sourceTerminalId"]')
        .selectOption(seeded.sourceTerminalId);
      await createForm
        .locator('select[name="destinationTerminalId"]')
        .selectOption(seeded.destinationTerminalId);
      await createForm
        .locator('select[name="productId"]')
        .selectOption(seeded.productId);
      await createForm.locator('input[name="requestedQuantity"]').fill("4");
      await createForm.locator('input[name="notes"]').fill("E2E full transfer");
      await createForm
        .getByRole("button", { name: "Request Transfer" })
        .click();

      const transfer = await expect
        .poll(async () =>
          prisma.branchTransfer.findFirst({
            where: {
              companyId: seeded!.companyId,
              sourceTerminalId: seeded!.sourceTerminalId,
            },
            orderBy: { createdAt: "desc" },
          }),
        )
        .not.toBeNull()
        .then(() =>
          prisma.branchTransfer.findFirstOrThrow({
            where: {
              companyId: seeded!.companyId,
              sourceTerminalId: seeded!.sourceTerminalId,
            },
            orderBy: { createdAt: "desc" },
          }),
        );
      expect(transfer.status).toBe("pending_approval");

      for (const [button, status] of [
        ["Approve", "approved"],
        ["Dispatch", "in_transit"],
      ] as const) {
        await reloadWithRetry(page);
        const row = page
          .getByRole("row")
          .filter({ hasText: transfer.transferNumber });
        await row.getByRole("button", { name: button, exact: true }).click();
        await expect
          .poll(
            async () =>
              (
                await prisma.branchTransfer.findUniqueOrThrow({
                  where: { id: transfer.id },
                })
              ).status,
          )
          .toBe(status);
      }
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productId },
            })
          ).quantity,
        ),
      ).toBe(6);

      await reloadWithRetry(page);
      const row = page
        .getByRole("row")
        .filter({ hasText: transfer.transferNumber });
      await row.locator('input[name="receivedQuantity"]').fill("4");
      const concurrentPage = await page.context().newPage();
      await concurrentPage.goto("/transfers");
      const concurrentRow = concurrentPage
        .getByRole("row")
        .filter({ hasText: transfer.transferNumber });
      await concurrentRow.locator('input[name="receivedQuantity"]').fill("4");
      await Promise.all([
        row.getByRole("button", { name: "Receive" }).click(),
        concurrentRow.getByRole("button", { name: "Receive" }).click(),
      ]);
      await expect
        .poll(
          async () =>
            (
              await prisma.branchTransfer.findUniqueOrThrow({
                where: { id: transfer.id },
              })
            ).status,
        )
        .toBe("received");
      await concurrentPage.close();

      const completed = await prisma.branchTransfer.findUniqueOrThrow({
        where: { id: transfer.id },
        include: { items: true },
      });
      expect(Number(completed.items[0].dispatchedQuantity)).toBe(4);
      expect(Number(completed.items[0].receivedQuantity)).toBe(4);
      expect(Number(completed.items[0].varianceQuantity)).toBe(0);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productId },
            })
          ).quantity,
        ),
      ).toBe(10);
      expect(
        (
          await prisma.stockMovement.findMany({
            where: { sourceId: transfer.id },
            orderBy: { createdAt: "asc" },
            select: {
              terminalId: true,
              movementType: true,
              quantityDelta: true,
            },
          })
        ).map((movement) => ({
          terminalId: movement.terminalId,
          type: movement.movementType,
          quantity: Number(movement.quantityDelta),
        })),
      ).toEqual([
        {
          terminalId: seeded.sourceTerminalId,
          type: "transfer_out",
          quantity: -4,
        },
        {
          terminalId: seeded.destinationTerminalId,
          type: "transfer_in",
          quantity: 4,
        },
      ]);
      expect(
        await prisma.auditLog.count({ where: { referenceId: transfer.id } }),
      ).toBe(4);
      await reloadWithRetry(page);
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: transfer.transferNumber })
          .getByRole("button", { name: "Receive" }),
      ).toHaveCount(0);

      const cancelForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Request Transfer" }),
      });
      await cancelForm
        .locator('select[name="sourceTerminalId"]')
        .selectOption(seeded.sourceTerminalId);
      await cancelForm
        .locator('select[name="destinationTerminalId"]')
        .selectOption(seeded.destinationTerminalId);
      await cancelForm
        .locator('select[name="productId"]')
        .selectOption(seeded.productId);
      await cancelForm.locator('input[name="requestedQuantity"]').fill("2");
      await cancelForm
        .getByRole("button", { name: "Request Transfer" })
        .click();
      const cancelledTransfer = await expect
        .poll(async () =>
          prisma.branchTransfer.findFirst({
            where: { companyId: seeded!.companyId, id: { not: transfer.id } },
            orderBy: { createdAt: "desc" },
          }),
        )
        .not.toBeNull()
        .then(() =>
          prisma.branchTransfer.findFirstOrThrow({
            where: { companyId: seeded!.companyId, id: { not: transfer.id } },
            orderBy: { createdAt: "desc" },
          }),
        );
      await reloadWithRetry(page);
      await page
        .getByRole("row")
        .filter({ hasText: cancelledTransfer.transferNumber })
        .getByRole("button", { name: "Cancel" })
        .click();
      await expect
        .poll(
          async () =>
            (
              await prisma.branchTransfer.findUniqueOrThrow({
                where: { id: cancelledTransfer.id },
              })
            ).status,
        )
        .toBe("cancelled");
      expect(
        await prisma.stockMovement.count({
          where: { sourceId: cancelledTransfer.id },
        }),
      ).toBe(0);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productId },
            })
          ).quantity,
        ),
      ).toBe(10);
    } finally {
      try {
        await seeded?.cleanup();
      } finally {
        try {
          await authUser?.cleanup();
        } finally {
          await profiles.cleanup();
        }
      }
    }
  });
});
