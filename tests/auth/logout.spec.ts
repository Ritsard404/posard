import { expect, test } from '@playwright/test';
import { expectLoginPage, loginAsTestUser } from '../fixtures/auth.fixture';

test.describe('auth logout', () => {
  test('logs out from the protected app shell and returns to login', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginAsTestUser(page);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(
      page.getByRole('heading', { name: 'Logout of POSard?' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();

    await expectLoginPage(page);
  });
});
