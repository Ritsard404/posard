import { expect, test, type Page } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  cashierCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';

type SeededPOSSession = {
  productNames: string[];
  cleanup: () => Promise<void>;
};

const responsiveProductCount = 64;

const desktopViewports = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
];

const mobileViewports = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
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
    Array.from({ length: responsiveProductCount }, (_, index) =>
      prisma.product.create({
        data: {
          name: `E2E POS RESPONSIVE PRODUCT ${index + 1} ${testId}`,
          barcode: `POS-${testId}-${index + 1}`,
          baseUnit: 'PCS',
          quantity: 20,
          cost: 10,
          price: 25 + index,
          isAvailable: true,
          trackInventory: false,
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
      isDefaultTerminal: true,
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
      const invoices = await prisma.invoice.findMany({
        where: { posTerminalId: terminal.id },
        select: { id: true },
      });
      const invoiceIds = invoices.map((invoice) => invoice.id);

      if (invoiceIds.length > 0) {
        await prisma.invoiceDocument.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        await prisma.promotionRedemptionLog.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        await prisma.auditLog.deleteMany({
          where: {
            OR: [
              { posTerminalId: terminal.id },
              { referenceId: { in: invoiceIds } },
            ],
          },
        });
        await prisma.stockMovement.deleteMany({
          where: {
            OR: [
              { terminalId: terminal.id },
              { sourceId: { in: invoiceIds } },
            ],
          },
        });
        await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      } else {
        await prisma.auditLog.deleteMany({
          where: { posTerminalId: terminal.id },
        });
        await prisma.stockMovement.deleteMany({
          where: { terminalId: terminal.id },
        });
      }

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
  await authenticatePageWithCredentials(page, cashierCredentials);
  await page.goto('/pos');

  await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);
  await expect(page.getByTestId('pos-shell')).toBeVisible({ timeout: 30_000 });
  const productSearch = page.getByPlaceholder(
    'Search name, barcode, generic, brand...',
  );
  await expect(productSearch).toBeVisible();
  await productSearch.fill(seeded.productNames[0]);
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
    const posShell = document.querySelector<HTMLElement>(
      '[data-testid="pos-shell"]',
    );
    const posWorkspace = document.querySelector<HTMLElement>(
      '[data-testid="pos-workspace"]',
    );
    const mobileOrderSummary = document.querySelector<HTMLElement>(
      '[data-testid="pos-mobile-order-summary"]',
    );
    const mobileTabs = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid^="pos-mobile-tab-"]'),
    );
    const receiptSheet = document.querySelector<HTMLElement>(
      '[data-testid="pos-mobile-receipt-sheet"]',
    );

    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentScrollWidth: scrollingElement.scrollWidth,
      documentScrollHeight: scrollingElement.scrollHeight,
      posShellHeight: posShell?.getBoundingClientRect().height ?? 0,
      posWorkspaceHeight: posWorkspace?.getBoundingClientRect().height ?? 0,
      productColumnWidth: productColumn?.getBoundingClientRect().width ?? 0,
      cartColumnWidth: cartColumn?.getBoundingClientRect().width ?? 0,
      productScrollClientHeight: productScroll?.clientHeight ?? 0,
      productScrollVisible:
        productScroll
          ? productScroll.getClientRects().length > 0 &&
            getComputedStyle(productScroll).display !== 'none'
          : false,
      cartItemsClientHeight: cartItems?.clientHeight ?? 0,
      cartItemsVisible:
        cartItems
          ? cartItems.getClientRects().length > 0 &&
            getComputedStyle(cartItems).display !== 'none'
          : false,
      mobileOrderSummaryHeight:
        mobileOrderSummary?.getBoundingClientRect().height ?? 0,
      mobileTabCount: mobileTabs.length,
      mobileTabMinHeight:
        mobileTabs.length > 0
          ? Math.min(
              ...mobileTabs.map((tab) => tab.getBoundingClientRect().height),
            )
          : 0,
      receiptSheetHeight: receiptSheet?.getBoundingClientRect().height ?? 0,
    };
  });
}

async function expectViewportContained(
  page: Page,
  expectedMobilePanel?: 'menu' | 'cart' | 'tender',
) {
  const metrics = await collectLayoutMetrics(page);
  const isPhoneLayout = metrics.viewportWidth < 768;

  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
    metrics.viewportWidth + 1,
  );
  expect(metrics.documentScrollHeight).toBeLessThanOrEqual(
    metrics.viewportHeight + 1,
  );
  expect(metrics.posShellHeight).toBeGreaterThan(0);
  expect(metrics.posWorkspaceHeight).toBeGreaterThan(0);

  if (isPhoneLayout) {
    expect(metrics.mobileTabCount).toBe(3);
    expect(metrics.mobileTabMinHeight).toBeGreaterThanOrEqual(48);
    expect(metrics.mobileOrderSummaryHeight).toBeGreaterThanOrEqual(56);

    if (expectedMobilePanel === 'menu') {
      expect(metrics.productScrollVisible).toBe(true);
      expect(metrics.productScrollClientHeight).toBeGreaterThan(0);
    }

    if (expectedMobilePanel === 'cart') {
      expect(metrics.cartItemsVisible).toBe(true);
      expect(metrics.cartItemsClientHeight).toBeGreaterThan(0);
    }
  } else {
    expect(metrics.productColumnWidth).toBeGreaterThan(0);
    expect(metrics.cartColumnWidth).toBeGreaterThanOrEqual(288);
    expect(metrics.productScrollClientHeight).toBeGreaterThan(0);
    expect(metrics.cartItemsClientHeight).toBeGreaterThan(0);
  }

  return metrics;
}

async function expectReceiptSheetContained(page: Page) {
  const metrics = await collectLayoutMetrics(page);

  expect(metrics.receiptSheetHeight).toBeGreaterThan(0);
  expect(metrics.receiptSheetHeight).toBeLessThanOrEqual(
    Math.ceil(metrics.viewportHeight * 0.94),
  );
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
    metrics.viewportWidth + 1,
  );
}

test.describe('POS responsive layout', () => {
  test('keeps the active POS layout inside the viewport across desktop and mobile tabs', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
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

      for (const viewport of mobileViewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(250);

        if (viewport.width < 768) {
          await page.getByTestId('pos-mobile-tab-menu').click();
          await expect(page.getByText(seeded.productNames[0])).toBeVisible();
          await expectViewportContained(page, 'menu');

          await page.getByText(seeded.productNames[0]).click();
          await expect(page.getByTestId('pos-mobile-order-summary')).toContainText(
            /item/,
          );

          await page.getByTestId('pos-mobile-tab-cart').click();
          await expect(page.getByTestId('pos-cart-items')).toContainText(
            seeded.productNames[0],
          );
          await expectViewportContained(page, 'cart');

          await page.getByRole('button', { name: /Go to Tender/i }).click();
          await page.getByRole('button', { name: 'Exact' }).click();
          await expect(
            page.getByRole('button', { name: /Complete Sale/i }),
          ).toBeVisible();
          await expectViewportContained(page, 'tender');

          await page.getByRole('button', { name: /Complete Sale/i }).click();
          await expect(page.getByText('Transaction Done')).toBeVisible({
            timeout: 30_000,
          });
          await expectReceiptSheetContained(page);
          await page.getByRole('button', { name: /New Checkout/i }).click();
          await expect(page.getByTestId('pos-mobile-tab-menu')).toBeVisible();
          await expect(page.getByText(seeded.productNames[0])).toBeVisible({
            timeout: 30_000,
          });
          await expectViewportContained(page, 'menu');
        } else {
          await expectViewportContained(page);
        }
      }
    } finally {
      await seeded?.cleanup();
      await authUser?.cleanup();
      await profiles.cleanup();
    }
  });
});
