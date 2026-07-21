import { expect, test } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  managerCredentials,
} from '../fixtures/auth.fixture';

const staticRoutes = [
  '/dashboard',
  '/pos',
  '/product',
  '/product/barcodes',
  '/customers',
  '/debts',
  '/expenses',
  '/inventory-ledger',
  '/promotions',
  '/purchase-orders',
  '/suppliers',
  '/transfers',
  '/kitchen',
  '/reports',
  '/reports/ai',
  '/reports/audit-trail',
  '/reports/pwd-senior',
  '/report',
  '/accounts',
  '/companies',
  '/terminals',
  '/subscriptions',
  '/approvals',
  '/business-fit',
  '/data-exchange',
  '/sync',
  '/settings',
  '/feature-guide',
  '/help',
] as const;

test('manager protected feature routes render without server errors @smoke', async ({
  page,
}) => {
  test.setTimeout(10 * 60_000);

  const profile = await prisma.profile.findUnique({
    where: { email: managerCredentials.email },
    select: { companyId: true },
  });
  if (!profile?.companyId) {
    throw new Error('Manager E2E profile must belong to a company.');
  }

  const companyRoutes = [
    `/companies/${profile.companyId}`,
    `/companies/${profile.companyId}/branches`,
    `/companies/${profile.companyId}/report`,
    `/companies/${profile.companyId}/settings`,
    `/companies/${profile.companyId}/settings/sale-types`,
    `/companies/${profile.companyId}/settings/sales-accounts`,
    `/companies/${profile.companyId}/terminals`,
    `/companies/${profile.companyId}/subscription`,
  ];

  await authenticatePageWithCredentials(page, managerCredentials);

  const failures: string[] = [];
  for (const route of [...staticRoutes, ...companyRoutes]) {
    try {
      let response = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await page.goto(route, {
            waitUntil: 'domcontentloaded',
            timeout: 45_000,
          });
          break;
        } catch (error) {
          if (
            attempt === 0 &&
            error instanceof Error &&
            /ERR_ABORTED|aborted/i.test(error.message)
          ) {
            continue;
          }
          throw error;
        }
      }
      const status = response?.status() ?? 0;
      if (status >= 500) {
        failures.push(`${route}: HTTP ${status}`);
        continue;
      }

      const body = page.locator('body');
      await expect(body).toBeVisible({ timeout: 15_000 });
      const text = await body.innerText();
      if (/Internal Server Error|Application error|This page could not be loaded/i.test(text)) {
        failures.push(`${route}: rendered an application error`);
      }
    } catch (error) {
      failures.push(
        `${route}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
      );
    }
  }

  expect(failures, failures.join('\n')).toEqual([]);
});
