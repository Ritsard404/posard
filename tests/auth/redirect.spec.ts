import { expect, test } from '@playwright/test';
import {
  createOnboardingAdminAccount,
  expectLoginPage,
  loginAsTestUser,
  loginWithCredentials,
} from '../fixtures/auth.fixture';

const protectedRouteGroups = [
  '/accounts',
  '/admin',
  '/approvals',
  '/companies',
  '/customers',
  '/dashboard',
  '/data-exchange',
  '/debts',
  '/expenses',
  '/feature-guide',
  '/help',
  '/inventory-ledger',
  '/kitchen',
  '/notifications',
  '/pos',
  '/product',
  '/promotions',
  '/purchase-orders',
  '/report',
  '/reports',
  '/settings',
  '/setup-company',
  '/subscriptions',
  '/suppliers',
  '/sync',
  '/terminals',
  '/transfers',
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('auth redirects', () => {
  test('allows unauthenticated users to visit public marketing pages', async ({
    page,
  }) => {
    for (const path of ['/pricing', '/solutions', '/features']) {
      await page.goto(path);

      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
  });

  test('redirects unauthenticated users from protected routes to login', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    for (const path of protectedRouteGroups) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveURL(
        new RegExp(
          `/auth/login\\?callbackUrl=${escapeRegExp(encodeURIComponent(path))}$`,
        ),
      );
      await expectLoginPage(page);
    }
  });

  test('redirects authenticated users away from the login page', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginAsTestUser(page);

    await page.goto('/auth/login');

    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });
  });

  test('renders query-driven auth error messages for signed-in users', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginAsTestUser(page);

    await page.goto('/auth/error?error=Auth%20callback%20failed');

    await expect(page.getByText('Sorry, something went wrong.')).toBeVisible();
    await expect(page.getByText('Code error: Auth callback failed')).toBeVisible();
  });

  test('redirects a new company admin with no company to onboarding after login', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const onboardingAdmin = await createOnboardingAdminAccount();

    try {
      await loginWithCredentials(page, onboardingAdmin.credentials);

      await expect(page).toHaveURL(/\/setup-company(?:\?.*)?$/, {
        timeout: 30_000,
      });
      await expect(page.getByText('Create Your Workspace')).toBeVisible();
      await expect(page.getByText('Company Essentials')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Launch My Workspace' }),
      ).toBeVisible();
    } finally {
      await onboardingAdmin.cleanup();
    }
  });
});
