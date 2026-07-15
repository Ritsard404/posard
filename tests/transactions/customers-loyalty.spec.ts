import { expect, test } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
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
