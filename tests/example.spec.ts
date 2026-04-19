import { test, expect } from '@playwright/test';

test.describe('public app smoke', () => {
  test('landing page renders the marketing hero', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('button', { name: 'Start Free Trial' }),
    ).toBeVisible();
    await expect(page.getByText('Trusted by 2,000+ businesses worldwide')).toBeVisible();
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
