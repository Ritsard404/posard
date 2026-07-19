import { test, expect } from '@playwright/test';

test.describe('public app smoke @smoke', () => {
  test('landing page renders the marketing hero', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('link', { name: 'Start with POSard' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'POSard POS system for any daily checkout.',
      }),
    ).toBeVisible();
  });

  test('login page renders the authentication form', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(
      page.getByText('Enter your credentials to access your terminal'),
    ).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });
});
