import { expect, test } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  cashierCredentials,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

test('reports, searches, and paginates customer loyalty balances @transaction', async ({ page }) => {
  test.setTimeout(240_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const featuredName = `E2E Loyalty Featured ${suffix}`;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const customers = await prisma.$transaction(
      Array.from({ length: 26 }, (_, index) => prisma.customer.create({
        data: {
          companyId: profiles.companyId,
          name: index === 0 ? featuredName : `E2E Loyalty ${suffix} ${String(index).padStart(2, '0')}`,
          phone: index === 0 ? '09171234567' : null,
          notes: index === 0 ? 'E2E searchable loyalty customer' : null,
        },
        select: { id: true },
      })),
    );
    await prisma.loyaltyTransaction.createMany({
      data: [
        { companyId: profiles.companyId, customerId: customers[0].id, transactionType: 'earn', pointsDelta: 50, reason: 'E2E purchase reward', createdAt: new Date('2030-01-01T00:00:00Z') },
        { companyId: profiles.companyId, customerId: customers[0].id, transactionType: 'redeem', pointsDelta: -15, reason: 'E2E reward redemption', createdAt: new Date('2030-01-02T00:00:00Z') },
      ],
    });

    await authenticatePageWithCredentials(page, managerCredentials);
    await page.goto('/customers');
    await expect(page).toHaveURL(/\/customers(?:\?.*)?$/);
    const unsupportedCustomerRoute = await page.request.get('/customers/new');
    expect(unsupportedCustomerRoute.status()).toBe(404);
    await expect(page.getByText('26 customers')).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('link', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/customers\?page=2$/);
    await expect(page.getByText('Showing 26-26 of 26 customers')).toBeVisible();

    await page.goto(`/customers?search=${encodeURIComponent(featuredName)}`);
    const row = page.getByRole('row').filter({ hasText: featuredName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('09171234567');
    await expect(row).toContainText('35 pts');
    await expect(row).toContainText('redeem -15 pts');
    await expect(page.getByText('1 customers')).toBeVisible();
  } finally {
    await prisma.loyaltyTransaction.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.customer.deleteMany({ where: { companyId: profiles.companyId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});

test('cashier customer view hides manager-only mutation controls @permissions', async ({ page }) => {
  test.setTimeout(180_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const customerName = `E2E Cashier Read Only ${suffix}`;
  let customerId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(cashierCredentials);
    const customer = await prisma.customer.create({
      data: { companyId: profiles.companyId, name: customerName, phone: '09222222222' },
      select: { id: true },
    });
    customerId = customer.id;
    await authenticatePageWithCredentials(page, cashierCredentials);
    await page.goto(`/customers?search=${encodeURIComponent(customerName)}`);
    const row = page.getByRole('row').filter({ hasText: customerName });
    await expect(row).toBeVisible();
    await expect(row.getByText('Manager only')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Apply' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Save' })).toHaveCount(0);
  } finally {
    if (customerId) await prisma.customer.delete({ where: { id: customerId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});

test('manager can edit a customer and apply an idempotent loyalty mutation @transaction', async ({ page }) => {
  test.setTimeout(240_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const originalName = `E2E Editable Customer ${suffix}`;
  const updatedName = `E2E Updated Customer ${suffix}`;
  let customerId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const customer = await prisma.customer.create({
      data: {
        companyId: profiles.companyId,
        name: originalName,
        phone: '09000000000',
      },
      select: { id: true },
    });
    customerId = customer.id;

    await authenticatePageWithCredentials(page, managerCredentials);
    await page.goto(`/customers?search=${encodeURIComponent(originalName)}`);
    const row = page.getByRole('row').filter({ hasText: originalName });
    await expect(row).toBeVisible();

    const editForm = row.locator('form').nth(1);
    await editForm.locator('input[name="name"]').fill(updatedName);
    await editForm.locator('input[name="phone"]').fill('09111111111');
    await editForm.getByRole('button', { name: 'Save' }).click();
    await expect.poll(async () => (await prisma.customer.findUnique({ where: { id: customer.id }, select: { name: true } }))?.name).toBe(updatedName);
    await page.goto(`/customers?search=${encodeURIComponent(updatedName)}`);
    await expect(page.getByRole('cell', { name: updatedName, exact: true })).toBeVisible();

    const updatedRow = page.getByRole('row').filter({ hasText: updatedName });
    const loyaltyForm = updatedRow.locator('form').first();
    await loyaltyForm.locator('select[name="transactionType"]').selectOption('earn');
    await loyaltyForm.locator('input[name="points"]').fill('25');
    await loyaltyForm.locator('input[name="reason"]').fill('E2E mutation coverage');
    await loyaltyForm.getByRole('button', { name: 'Apply' }).click();
    await expect.poll(async () => (await prisma.loyaltyTransaction.findMany({ where: { customerId: customer.id }, select: { pointsDelta: true } })).map((entry) => entry.pointsDelta)).toEqual([25]);
    await page.goto(`/customers?search=${encodeURIComponent(updatedName)}`);
    const refreshedRow = page.getByRole('row').filter({ hasText: updatedName });
    await expect(refreshedRow).toContainText('25 pts');

    const persisted = await prisma.customer.findUnique({ where: { id: customer.id }, select: { name: true, phone: true } });
    expect(persisted).toEqual({ name: updatedName, phone: '09111111111' });
    const loyalty = await prisma.loyaltyTransaction.findMany({ where: { customerId: customer.id }, select: { pointsDelta: true, reason: true } });
    expect(loyalty).toEqual([{ pointsDelta: 25, reason: 'E2E mutation coverage' }]);
    expect(await prisma.workflowMutationRequest.count({ where: { entityId: customer.id } })).toBe(2);
  } finally {
    if (customerId) {
      await prisma.workflowMutationRequest.deleteMany({ where: { entityId: customerId } });
      await prisma.loyaltyTransaction.deleteMany({ where: { customerId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
