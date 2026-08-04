import { expect, test, type Page } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

async function openInventoryAsManager(page: Page) {
  await authenticatePageWithCredentials(page, managerCredentials);
  await page.goto('/inventory-ledger');
  await expect(page).toHaveURL(/\/inventory-ledger(?:\?.*)?$/);
}

test('adjusts, counts, approves/rejects, and disposes tracked inventory @transaction', async ({ page }) => {
  test.setTimeout(300_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const productName = `E2E Inventory Control ${suffix}`;
  let categoryId: string | null = null;
  let productId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const category = await prisma.category.create({
      data: { companyId: profiles.companyId, categoryName: `E2E INVENTORY ${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;
    const product = await prisma.product.create({
      data: {
        companyId: profiles.companyId,
        categoryId,
        name: productName,
        barcode: `INV-${suffix}`,
        baseUnit: 'PCS',
        quantity: 20,
        cost: 4,
        price: 10,
        trackInventory: true,
        isAvailable: true,
        itemType: 'RESALE',
        vatType: 'VATABLE',
      },
      select: { id: true },
    });
    productId = product.id;
    await openInventoryAsManager(page);

    const adjustmentForm = page.locator('form').filter({
      has: page.getByRole('button', { name: 'Adjust Stock' }),
    });
    await adjustmentForm.locator('select[name="productId"]').selectOption(productId);
    await adjustmentForm.locator('select[name="direction"]').selectOption('increase');
    await adjustmentForm.locator('input[name="quantity"]').fill('3');
    await adjustmentForm.locator('input[name="reason"]').fill('E2E opening correction');
    const adjustStock = adjustmentForm.getByRole('button', { name: 'Adjust Stock' });
    await adjustStock.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect.poll(async () => Number((await prisma.product.findUniqueOrThrow({ where: { id: productId! } })).quantity)).toBe(23);

    const countForm = page.locator('form').filter({
      has: page.getByRole('button', { name: 'Start Count' }),
    });
    await countForm.locator('select[name="productId"]').selectOption(productId);
    await countForm.locator('input[name="countedQuantity"]').fill('21');
    await countForm.locator('input[name="notes"]').fill('E2E approved count');
    const startCount = countForm.getByRole('button', { name: 'Start Count' });
    await startCount.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    const approvedCount = await expect.poll(async () => prisma.stockCountSession.findFirst({
      where: { companyId: profiles.companyId, notes: 'E2E approved count' },
      include: { items: true },
    })).not.toBeNull().then(() => prisma.stockCountSession.findFirstOrThrow({
      where: { companyId: profiles.companyId, notes: 'E2E approved count' },
      include: { items: true },
    }));
    expect(approvedCount.status).toBe('submitted');
    expect(Number(approvedCount.items[0]?.varianceQuantity)).toBe(-2);
    await page.reload();
    const approvedCard = page.locator('div.rounded-md.border.bg-background.p-2\\.5').filter({ hasText: approvedCount.countNumber });
    await approvedCard.getByRole('button', { name: 'Approve' }).click();
    await expect.poll(async () => (await prisma.stockCountSession.findUniqueOrThrow({ where: { id: approvedCount.id } })).status).toBe('approved');
    await expect.poll(async () => Number((await prisma.product.findUniqueOrThrow({ where: { id: productId! } })).quantity)).toBe(21);

    await page.reload();
    const refreshedCountForm = page.locator('form').filter({
      has: page.getByRole('button', { name: 'Start Count' }),
    });
    await refreshedCountForm.locator('select[name="productId"]').selectOption(productId);
    await refreshedCountForm.locator('input[name="countedQuantity"]').fill('19');
    await refreshedCountForm.locator('input[name="notes"]').fill('E2E rejected count');
    await refreshedCountForm.getByRole('button', { name: 'Start Count' }).click();
    const rejectedCount = await expect.poll(async () => prisma.stockCountSession.findFirst({
      where: { companyId: profiles.companyId, notes: 'E2E rejected count' },
    })).not.toBeNull().then(() => prisma.stockCountSession.findFirstOrThrow({
      where: { companyId: profiles.companyId, notes: 'E2E rejected count' },
    }));
    await page.reload();
    const rejectedCard = page.locator('div.rounded-md.border.bg-background.p-2\\.5').filter({ hasText: rejectedCount.countNumber });
    await rejectedCard.getByRole('button', { name: 'Reject' }).click();
    await expect.poll(async () => (await prisma.stockCountSession.findUniqueOrThrow({ where: { id: rejectedCount.id } })).status).toBe('rejected');
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).quantity)).toBe(21);

    await page.reload();
    const dispositionForm = page.locator('form').filter({
      has: page.getByRole('button', { name: 'Record Loss' }),
    });
    await dispositionForm.locator('select[name="reason"]').selectOption('damaged');
    await dispositionForm.locator('select[name="productId"]').selectOption(productId);
    await dispositionForm.locator('input[name="quantity"]').fill('2');
    await dispositionForm.locator('input[name="notes"]').fill('E2E damaged stock');
    const recordLoss = dispositionForm.getByRole('button', { name: 'Record Loss' });
    await recordLoss.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect.poll(async () => Number((await prisma.product.findUniqueOrThrow({ where: { id: productId! } })).quantity)).toBe(19);

    for (const scenario of [
      { notes: 'E2E matching count', counted: '19', expectedStatus: 'approved' },
      { notes: 'E2E overage count', counted: '20', expectedStatus: 'approved' },
    ]) {
      await page.reload();
      const scenarioForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Start Count' }),
      });
      await scenarioForm.locator('select[name="productId"]').selectOption(productId);
      await scenarioForm.locator('input[name="countedQuantity"]').fill(scenario.counted);
      await scenarioForm.locator('input[name="notes"]').fill(scenario.notes);
      await scenarioForm.getByRole('button', { name: 'Start Count' }).click();
      const session = await expect.poll(async () => prisma.stockCountSession.findFirst({
        where: { companyId: profiles.companyId, notes: scenario.notes },
      })).not.toBeNull().then(() => prisma.stockCountSession.findFirstOrThrow({
        where: { companyId: profiles.companyId, notes: scenario.notes },
      }));
      await page.reload();
      const card = page.locator('div.rounded-md.border.bg-background.p-2\\.5').filter({ hasText: session.countNumber });
      await card.getByRole('button', { name: 'Approve' }).click();
      await expect.poll(async () => (await prisma.stockCountSession.findUniqueOrThrow({ where: { id: session.id } })).status).toBe(scenario.expectedStatus);
    }
    await expect.poll(async () => Number((await prisma.product.findUniqueOrThrow({ where: { id: productId! } })).quantity)).toBe(20);

    const movements = await prisma.stockMovement.findMany({
      where: { companyId: profiles.companyId, productId },
      orderBy: { createdAt: 'asc' },
    });
    expect(movements.map((movement) => movement.movementType)).toEqual(['adjustment', 'adjustment', 'waste', 'adjustment']);
    expect(movements.map((movement) => Number(movement.quantityDelta))).toEqual([3, -2, -2, 1]);
    expect(await prisma.auditLog.count({
      where: {
        companyId: profiles.companyId,
        actionType: { in: ['stock_adjustment_created', 'stock_count_created', 'stock_count_approve', 'stock_count_reject', 'stock_disposition_created'] },
      },
    })).toBe(10);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Inventory Health' }).last()).toBeVisible();
  } finally {
    await prisma.auditLog.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.userNotification.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.stockMovement.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.stockAdjustmentRequest.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.stockDispositionRequest.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.stockCountSession.deleteMany({ where: { companyId: profiles.companyId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
