import { expect, test } from '@playwright/test';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  expectLoginPage,
  managerCredentials,
} from '../fixtures/auth.fixture';

test.describe('auth logout @smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test('logs out from the protected app shell and returns to login', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const profiles = await ensurePosResponsiveProfiles();
    const authUser = await ensureAuthUserForProfile(managerCredentials);
    try {
      await authenticatePageWithCredentials(page, managerCredentials);
      await page.goto('/dashboard');
      await expect(
        page.getByRole('button', { name: 'Log out', exact: true }),
      ).toBeVisible({ timeout: 60_000 });

      await page.getByRole('button', { name: 'Log out', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Logout of POSard?' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Logout', exact: true }).click();

      await expectLoginPage(page);
    } finally {
      await authUser.cleanup();
      await profiles.cleanup();
    }
  });

  test('clears protected HTML, RSC, API, and export Cache Storage entries after logout', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const profiles = await ensurePosResponsiveProfiles();
    const authUser = await ensureAuthUserForProfile(managerCredentials);
    try {
      await authenticatePageWithCredentials(page, managerCredentials);
      await page.goto('/dashboard');
      await expect(
        page.getByRole('button', { name: 'Log out', exact: true }),
      ).toBeVisible({ timeout: 60_000 });

      await page.evaluate(async () => {
        const protectedEntries: Array<[string, string]> = [
          ['apis', '/api/sync/bootstrap?deviceId=cache-test-device'],
          ['others', '/dashboard'],
          ['others', '/pos'],
          ['next-data', '/_next/data/cache-test/dashboard.json'],
          ['next-data', '/pos?_rsc=cache-test'],
          ['static-data-assets', '/reports/export?format=xls'],
          ['static-data-assets', '/data-exchange/backup/export'],
          ['posard-network-only', '/data-exchange/product-catalog/export'],
        ];

        await Promise.all(
          protectedEntries.map(async ([cacheName, url]) => {
            const cache = await caches.open(cacheName);
            await cache.put(url, new Response('protected-data'));
          }),
        );
      });

      await page.getByRole('button', { name: 'Log out', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Logout of POSard?' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Logout', exact: true }).click();

      await expectLoginPage(page);

      const remainingProtectedEntries = await page.evaluate(async () => {
        const protectedCacheNames = new Set([
          'apis',
          'others',
          'next-data',
          'static-data-assets',
          'posard-network-only',
        ]);
        const names = await caches.keys();

        return names.filter((cacheName) => protectedCacheNames.has(cacheName));
      });

      expect(remainingProtectedEntries).toEqual([]);
    } finally {
      await authUser.cleanup();
      await profiles.cleanup();
    }
  });
});
