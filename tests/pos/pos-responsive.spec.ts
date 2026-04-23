import { expect, test, type Page } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  cashierCredentials,
  ensureAuthUserForProfile,
  loginAsCashier,
  managerCredentials,
} from '../fixtures/auth.fixture';

type SeededPOSSession = {
  productNames: string[];
  cleanup: () => Promise<void>;
};

const desktopViewports = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
];

async function seedActivePOSSession(): Promise<SeededPOSSession> {
  const [cashier, manager] = await Promise.all([
    prisma.profile.findUnique({
      where: { email: cashierCredentials.email },
      select: { id: true, companyId: true },
    }),
    prisma.profile.findUnique({
      where: { email: managerCredentials.email },
      select: { id: true, companyId: true },
    }),
  ]);

  if (!cashier?.companyId) {
    throw new Error(
      `Cashier test account ${cashierCredentials.email} must have an active companyId.`,
    );
  }

  if (!manager?.id || manager.companyId !== cashier.companyId) {
    throw new Error(
      `Manager test account ${managerCredentials.email} must belong to the cashier company.`,
    );
  }

  const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const categories = await Promise.all(
    Array.from({ length: 15 }, (_, index) =>
      prisma.category.create({
        data: {
          categoryName: `E2E POS RESPONSIVE CATEGORY ${index + 1} ${testId}`.toUpperCase(),
          companyId: cashier.companyId,
        },
        select: { id: true },
      }),
    ),
  );

  const products = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      prisma.product.create({
        data: {
          name: `E2E POS RESPONSIVE PRODUCT ${index + 1} ${testId}`,
          barcode: `POS-${testId}-${index + 1}`,
          baseUnit: 'PCS',
          quantity: 20,
          cost: 10,
          price: 25 + index,
          isAvailable: true,
          trackInventory: true,
          itemType: 'RESALE',
          vatType: 'VATABLE',
          categoryId: categories[0].id,
          companyId: cashier.companyId,
        },
        select: { id: true, name: true },
      }),
    ),
  );

  const terminal = await prisma.posTerminalInfo.create({
    data: {
      minNumber: `MIN-${testId}`,
      accreditationNumber: `ACC-${testId}`,
      ptuNumber: `PTU-${testId}`,
      dateIssued: new Date('2024-01-01'),
      validUntil: new Date('2035-01-01'),
      posName: `E2E POS ${testId}`,
      registeredName: 'E2E POSard',
      operatedBy: 'E2E POSard',
      address: 'E2E Test Address',
      vatTinNumber: `TIN-${testId}`,
      vat: 12,
      discountMax: 0,
      isActive: true,
      companyId: cashier.companyId,
    },
    select: { id: true },
  });

  const timestamp = await prisma.timestamp.create({
    data: {
      posTerminalId: terminal.id,
      cashierId: cashier.id,
      managerInId: manager.id,
      timestampIn: new Date(),
      cashInDrawerAmount: 1000,
    },
    select: { id: true },
  });

  return {
    productNames: products.map((product) => product.name),
    async cleanup() {
      await prisma.timestamp.deleteMany({ where: { id: timestamp.id } });
      await prisma.product.deleteMany({
        where: { id: { in: products.map((product) => product.id) } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: categories.map((category) => category.id) } },
      });
      await prisma.posTerminalInfo.deleteMany({ where: { id: terminal.id } });
    },
  };
}

async function openSeededPOS(page: Page, seeded: SeededPOSSession) {
  await loginAsCashier(page);
  await page.goto('/pos');

  await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);
  await expect(page.getByTestId('pos-shell')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByPlaceholder('Search products...')).toBeVisible();
  await page.getByPlaceholder('Search products...').fill(seeded.productNames[0]);
  await expect(page.getByText(seeded.productNames[0])).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/\d+ categories/)).toBeVisible();
}

async function collectLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const cartColumn = document.querySelector<HTMLElement>(
      '[data-testid="pos-cart-column"]',
    );
    const productColumn = document.querySelector<HTMLElement>(
      '[data-testid="pos-product-column"]',
    );
    const productScroll = document.querySelector<HTMLElement>(
      '[data-testid="pos-product-scroll"]',
    );
    const cartItems = document.querySelector<HTMLElement>(
      '[data-testid="pos-cart-items"]',
    );

    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentScrollWidth: scrollingElement.scrollWidth,
      documentScrollHeight: scrollingElement.scrollHeight,
      productColumnWidth: productColumn?.getBoundingClientRect().width ?? 0,
      cartColumnWidth: cartColumn?.getBoundingClientRect().width ?? 0,
      productScrollClientHeight: productScroll?.clientHeight ?? 0,
      cartItemsClientHeight: cartItems?.clientHeight ?? 0,
    };
  });
}

async function expectViewportContained(page: Page) {
  const metrics = await collectLayoutMetrics(page);

  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
    metrics.viewportWidth + 1,
  );
  expect(metrics.documentScrollHeight).toBeLessThanOrEqual(
    metrics.viewportHeight + 1,
  );
  expect(metrics.productColumnWidth).toBeGreaterThan(0);
  expect(metrics.cartColumnWidth).toBeGreaterThanOrEqual(288);
  expect(metrics.productScrollClientHeight).toBeGreaterThan(0);
  expect(metrics.cartItemsClientHeight).toBeGreaterThan(0);

  return metrics;
}

test.describe('POS small desktop responsiveness', () => {
  test('keeps the active POS layout inside the viewport while sidebar toggles', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const authUser = await ensureAuthUserForProfile(cashierCredentials);
    let seeded: SeededPOSSession | null = null;

    try {
      seeded = await seedActivePOSSession();
      await openSeededPOS(page, seeded);

      for (const viewport of desktopViewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(250);

        const firstState = await expectViewportContained(page);

        await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
        await page.waitForTimeout(300);

        const secondState = await expectViewportContained(page);

        expect(secondState.cartColumnWidth).toBe(firstState.cartColumnWidth);
      }
    } finally {
      await seeded?.cleanup();
      await authUser.cleanup();
    }
  });
});
