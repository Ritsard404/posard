import { expect, test, type Page } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  POSARD_APP_MODE_COOKIE,
} from '../../lib/mobile-app-mode';
import {
  authenticatePageWithCredentials,
  cashierCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

type SeededPOSSession = {
  companyId: string;
  productIds: string[];
  productNames: string[];
  terminalId: string;
  cleanup: () => Promise<void>;
};

const responsiveProductCount = 64;

const desktopViewports = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];

const mobileViewports = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
];

async function seedActivePOSSession(): Promise<SeededPOSSession> {
  assertE2EDatabaseWritesAllowed();
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
      isDefaultTerminal: true,
      allowCashierDebtCreate: true,
      allowCashierDebtCollect: true,
      requireManagerApprovalForDebt: true,
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
    companyId: cashier.companyId,
    productIds: products.map((product) => product.id),
    productNames: products.map((product) => product.name),
    terminalId: terminal.id,
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
        await prisma.inventory.deleteMany({
          where: { productId: { in: products.map((product) => product.id) } },
        });
        await prisma.invoiceReturn.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        await prisma.customerDebtPayment.deleteMany({
          where: { companyId: cashier.companyId! },
        });
        await prisma.customerDebt.deleteMany({
          where: { companyId: cashier.companyId! },
        });
        await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
        await prisma.customer.deleteMany({
          where: { companyId: cashier.companyId! },
        });
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
  const bootstrapFinished = page
    .waitForResponse(
      (response) =>
        response.url().includes('/api/sync/bootstrap') &&
        response.request().method() === 'GET',
      { timeout: 45_000 },
    )
    .catch(() => null);
  await page.goto('/pos');
  await bootstrapFinished;

  await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);
  await expect(page.getByTestId('pos-shell')).toBeVisible({ timeout: 30_000 });
  const productSearch = page.getByPlaceholder(
    'Search name, barcode, generic, brand...',
  );
  await expect(productSearch).toBeVisible();
  await productSearch.fill(seeded.productNames[0]);
  const seededProduct = page.getByText(seeded.productNames[0]);
  if (!(await seededProduct.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.reload();
    await expect(productSearch).toBeVisible({ timeout: 30_000 });
    await productSearch.fill(seeded.productNames[0]);
  }
  await expect(seededProduct).toBeVisible({ timeout: 30_000 });
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

test.describe('POS responsive layout @smoke', () => {
  test('keeps the active POS layout inside the viewport across desktop and mobile tabs', async ({
    page,
  }) => {
    test.setTimeout(360_000);

    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;
    let soldInvoiceId: string | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await openSeededPOS(page, seeded);
      const seededTerminalId = seeded.terminalId;
      const seededProductId = seeded.productIds[0];

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
          await openSeededPOS(page, seeded);
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

          const invoiceCountBefore = await prisma.invoice.count({
            where: { posTerminalId: seededTerminalId },
          });
          const productBefore = await prisma.product.findUniqueOrThrow({
            where: { id: seededProductId },
            select: { quantity: true },
          });

          await page.getByRole('button', { name: /Complete Sale/i }).click();
          await expect(page.getByText('Transaction Done')).toBeVisible({
            timeout: 30_000,
          });

          const savedInvoice = await expect
            .poll(async () => {
              const invoice = await prisma.invoice.findFirst({
                where: { posTerminalId: seededTerminalId },
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  status: true,
                  grossAmount: true,
                  subTotal: true,
                  totalAmount: true,
                  totalTendered: true,
                  changeAmount: true,
                  vatSales: true,
                  vatAmount: true,
                  idempotencyKey: true,
                  items: {
                    select: {
                      productId: true,
                      qty: true,
                      price: true,
                      subTotal: true,
                      status: true,
                    },
                  },
                },
              });

              return invoice
                ? {
                    id: invoice.id,
                    status: invoice.status,
                    grossAmount: Number(invoice.grossAmount),
                    subTotal: Number(invoice.subTotal),
                    totalAmount: Number(invoice.totalAmount),
                    totalTendered: Number(invoice.totalTendered),
                    changeAmount: Number(invoice.changeAmount),
                    vatSales: Number(invoice.vatSales),
                    vatAmount: Number(invoice.vatAmount),
                    idempotencyKey: invoice.idempotencyKey,
                    items: invoice.items.map((item) => ({
                      productId: item.productId,
                      qty: Number(item.qty),
                      price: Number(item.price),
                      subTotal: Number(item.subTotal),
                      status: item.status,
                    })),
                  }
                : null;
            }, { timeout: 45_000 })
            .not.toBeNull()
            .then(async () => {
              return prisma.invoice.findFirstOrThrow({
                where: { posTerminalId: seededTerminalId },
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  status: true,
                  grossAmount: true,
                  subTotal: true,
                  totalAmount: true,
                  totalTendered: true,
                  changeAmount: true,
                  vatSales: true,
                  vatAmount: true,
                  idempotencyKey: true,
                  items: {
                    select: {
                      productId: true,
                      qty: true,
                      price: true,
                      subTotal: true,
                      status: true,
                    },
                  },
                },
              });
            });

          expect(await prisma.invoice.count({
            where: { posTerminalId: seededTerminalId },
          })).toBe(invoiceCountBefore + 1);
          soldInvoiceId = savedInvoice.id;
          expect(savedInvoice.status).toBe('PAID');
          expect(Number(savedInvoice.grossAmount)).toBe(25);
          expect(Number(savedInvoice.subTotal)).toBe(22.32);
          expect(Number(savedInvoice.totalAmount)).toBe(25);
          expect(Number(savedInvoice.totalTendered)).toBe(25);
          expect(Number(savedInvoice.changeAmount)).toBe(0);
          expect(Number(savedInvoice.vatSales)).toBe(22.32);
          expect(Number(savedInvoice.vatAmount)).toBe(2.68);
          expect(
            Number(savedInvoice.subTotal) + Number(savedInvoice.vatAmount),
          ).toBe(Number(savedInvoice.totalAmount));
          expect(savedInvoice.idempotencyKey).toBeTruthy();
          expect(savedInvoice.items).toHaveLength(1);
          expect(savedInvoice.items[0]).toMatchObject({
            productId: seededProductId,
            status: 'PAID',
          });
          expect(Number(savedInvoice.items[0].qty)).toBe(1);
          expect(Number(savedInvoice.items[0].price)).toBe(25);
          expect(Number(savedInvoice.items[0].subTotal)).toBe(25);

          await expect.poll(async () => {
            const product = await prisma.product.findUniqueOrThrow({
              where: { id: seededProductId },
              select: { quantity: true },
            });
            return Number(product.quantity);
          }).toBe(Number(productBefore.quantity) - 1);

          await expect.poll(() => prisma.auditLog.count({
            where: {
              posTerminalId: seededTerminalId,
              referenceId: savedInvoice.id,
            },
          })).toBeGreaterThan(0);
          await expectReceiptSheetContained(page);
          await page.getByRole('button', { name: /New Checkout/i }).click();
          await expect(page.getByTestId('pos-mobile-tab-menu')).toBeVisible();
          await expectViewportContained(page, 'menu');
        } else {
          await expectViewportContained(page);
        }
      }

      expect(soldInvoiceId).toBeTruthy();
      await authenticatePageWithCredentials(page, managerCredentials);
      await page.goto(
        `/reports/sales?companyId=${seeded.companyId}&terminalId=${seeded.terminalId}&preset=today`,
      );
      await expect(page.getByText(seeded.productNames[0])).toBeVisible({
        timeout: 45_000,
      });
      await page.getByRole('button', { name: 'Return', exact: true }).click();
      const returnDialog = page.getByRole('dialog');
      const returnQuantity = returnDialog.locator('input[type="number"]');
      await returnQuantity.fill('999');
      await expect(returnQuantity).toHaveValue('1');
      await page.getByLabel('Reason').selectOption('Wrong item');
      await page.getByLabel('Manager PIN').fill('0000');
      await page.getByLabel('Notes').fill('E2E invalid approval attempt');
      await page.getByRole('button', { name: 'Confirm Return' }).click();
      await expect(page.locator('[data-sonner-toast][data-type="error"]').last()).toBeVisible();
      expect(await prisma.invoiceReturn.count({ where: { invoiceId: soldInvoiceId! } })).toBe(0);
      expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: seeded.productIds[0] } })).quantity)).toBe(19);

      await returnQuantity.fill('0.5');
      await page.getByLabel('Manager PIN').fill('2468');
      await page.getByLabel('Notes').fill('E2E reconciled partial return');
      await page.getByRole('button', { name: 'Confirm Return' }).click();
      await expect(page.getByText(/Return R-\d+ recorded\./)).toBeVisible();

      const partiallyReturnedInvoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: soldInvoiceId! },
        include: {
          items: { include: { returnItems: true } },
          returns: { include: { items: true } },
        },
      });
      expect(partiallyReturnedInvoice.status).toBe('PAID');
      expect(Number(partiallyReturnedInvoice.returnedAmount)).toBe(12.5);
      expect(partiallyReturnedInvoice.items[0].status).toBe('PAID');
      expect(Number(partiallyReturnedInvoice.items[0].returnItems[0].returnedQty)).toBe(0.5);
      expect(partiallyReturnedInvoice.returns).toHaveLength(1);
      expect(partiallyReturnedInvoice.returns[0].returnType).toBe('PARTIAL');
      expect(Number(partiallyReturnedInvoice.returns[0].totalReturned)).toBe(12.5);
      expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: seeded.productIds[0] } })).quantity)).toBe(19.5);

      await page.reload();
      await expect(page.getByText(seeded.productNames[0])).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Return', exact: true }).click();
      await page.getByRole('button', { name: 'Full Remaining' }).click();
      await page.getByLabel('Reason').selectOption('Wrong item');
      await page.getByLabel('Manager PIN').fill('2468');
      await page.getByLabel('Notes').fill('E2E reconciled final return');
      await page.getByRole('button', { name: 'Confirm Return' }).click();
      await expect(page.getByText(/Return R-\d+ recorded\./)).toBeVisible();

      const returnedInvoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: soldInvoiceId! },
        include: {
          items: { include: { returnItems: true } },
          returns: { include: { items: true } },
        },
      });
      expect(returnedInvoice.status).toBe('RETURNED');
      expect(Number(returnedInvoice.returnedAmount)).toBe(25);
      expect(returnedInvoice.items[0].status).toBe('RETURNED');
      expect(returnedInvoice.items[0].returnItems.map((item) => Number(item.returnedQty))).toEqual([0.5, 0.5]);
      expect(returnedInvoice.returns).toHaveLength(2);
      expect(returnedInvoice.returns.map((item) => item.returnType)).toEqual(['PARTIAL', 'FULL']);
      expect(returnedInvoice.returns.map((item) => Number(item.totalReturned))).toEqual([12.5, 12.5]);
      expect(returnedInvoice.returns.map((item) => Number(item.items[0].lineAmount))).toEqual([12.5, 12.5]);

      const restoredProduct = await prisma.product.findUniqueOrThrow({
        where: { id: seeded.productIds[0] },
        select: { quantity: true },
      });
      expect(Number(restoredProduct.quantity)).toBe(20);
      await expect.poll(async () => ({
        partial: await prisma.auditLog.count({
          where: { referenceId: soldInvoiceId!, actionType: 'INVOICE_RETURNED_PARTIAL' },
        }),
        full: await prisma.auditLog.count({
          where: { referenceId: soldInvoiceId!, actionType: 'INVOICE_RETURNED_FULL' },
        }),
        approvals: await prisma.auditLog.count({
          where: { referenceId: soldInvoiceId!, actionType: 'RETURN_APPROVED' },
        }),
      })).toEqual({ partial: 1, full: 1, approvals: 2 });

      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);
      const productSearch = page.getByPlaceholder(
        'Search name, barcode, generic, brand...',
      );
      await productSearch.fill(seeded.productNames[1]);
      await page.getByText(seeded.productNames[1]).click();
      await expect(page.getByTestId('pos-cart-items')).toContainText(
        seeded.productNames[1],
      );
      await page.getByRole('button', { name: 'Void', exact: true }).click();
      await page.getByRole('textbox', { name: 'Reason' }).fill(
        'E2E cancelled before payment',
      );
      await page.getByRole('button', { name: 'Continue' }).click();
      const invoiceCountBeforeInvalidVoid = await prisma.invoice.count({
        where: { posTerminalId: seeded.terminalId },
      });
      await page.locator('#managerPin').fill('0000');
      await page.getByRole('button', { name: 'Authorize' }).click();
      await expect(page.locator('[data-sonner-toast][data-type="error"]').last()).toBeVisible();
      expect(await prisma.invoice.count({ where: { posTerminalId: seeded.terminalId } })).toBe(invoiceCountBeforeInvalidVoid);
      await page.locator('#managerPin').fill('2468');
      await page.getByRole('button', { name: 'Authorize' }).click();
      await expect(page.getByText('Order cancelled successfully.')).toBeVisible();

      const voidInvoice = await prisma.invoice.findFirstOrThrow({
        where: { posTerminalId: seeded.terminalId, status: 'VOID' },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
      expect(Number(voidInvoice.grossAmount)).toBe(26);
      expect(Number(voidInvoice.totalAmount)).toBe(0);
      expect(Number(voidInvoice.totalTendered)).toBe(0);
      expect(voidInvoice.reason).toBe('E2E cancelled before payment');
      expect(voidInvoice.items).toHaveLength(1);
      expect(voidInvoice.items[0].status).toBe('VOID');
      expect(Number(voidInvoice.items[0].subTotal)).toBe(0);
      expect(await prisma.auditLog.count({
        where: { referenceId: voidInvoice.id, actionType: 'ORDER_VOIDED' },
      })).toBe(1);
      const voidedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: seeded.productIds[1] },
        select: { quantity: true },
      });
      expect(Number(voidedProduct.quantity)).toBe(20);

    } finally {
      try {
        await seeded?.cleanup();
      } finally {
        try {
          await authUser?.cleanup();
        } finally {
          await profiles.cleanup();
        }
      }
    }
  });

  test('creates an approved debt sale and reconciles partial and final collections @transaction', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);

      const debtCustomerName = `E2E Debt Customer ${Date.now()}`;
      const productSearch = page.getByPlaceholder(
        'Search name, barcode, generic, brand...',
      );
      await productSearch.fill(seeded.productNames[2]);
      await page.getByText(seeded.productNames[2]).click();
      await page.getByRole('button', { name: 'Checkout', exact: true }).click();
      await page.getByRole('button', { name: 'Record as Utang' }).click();
      await page.getByPlaceholder('Add customer name').fill(debtCustomerName);
      await page.locator('input[type="date"]').fill('2030-01-31');
      await page.getByPlaceholder('Optional debt notes').fill('E2E debt lifecycle');
      await page.getByRole('button', { name: 'Complete Sale' }).click();
      await page.locator('#managerPin').pressSequentially('2468');
      await page.getByRole('button', { name: 'Authorize' }).click();

      const transactionDone = page.getByText('Transaction Done');
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]').last();
      await expect.poll(async () => {
        if (await transactionDone.isVisible().catch(() => false)) return 'done';
        if (await errorToast.isVisible().catch(() => false)) {
          return `error:${await errorToast.innerText()}`;
        }
        return 'pending';
      }, { timeout: 30_000 }).toBe('done');

      const debt = await prisma.customerDebt.findFirstOrThrow({
        where: { companyId: seeded.companyId, customer: { name: debtCustomerName } },
        include: { invoice: { include: { items: true } } },
      });
      expect(debt.status).toBe('UNPAID');
      expect(Number(debt.originalAmount)).toBe(27);
      expect(Number(debt.paidAmount)).toBe(0);
      expect(Number(debt.remainingAmount)).toBe(27);
      expect(debt.invoice.status).toBe('PENDING');
      expect(Number(debt.invoice.cashTendered)).toBe(0);
      expect(Number(debt.invoice.totalTendered)).toBe(0);
      expect(debt.invoice.items[0].status).toBe('PENDING');

      await page.goto('/debts');
      let debtRow = page.getByRole('row').filter({ hasText: debtCustomerName });
      await expect(debtRow).toBeVisible({ timeout: 30_000 });
      await debtRow.getByPlaceholder('Amount').fill('10');
      await debtRow.getByPlaceholder('Collection notes').fill('E2E partial collection');
      await debtRow.getByRole('button', { name: 'Record' }).click();
      await expect(page.getByText('Debt payment recorded.')).toBeVisible();
      await expect.poll(async () => {
        const updated = await prisma.customerDebt.findUniqueOrThrow({ where: { id: debt.id } });
        return {
          status: updated.status,
          paid: Number(updated.paidAmount),
          remaining: Number(updated.remainingAmount),
        };
      }).toEqual({ status: 'PARTIAL', paid: 10, remaining: 17 });

      await page.reload();
      debtRow = page.getByRole('row').filter({ hasText: debtCustomerName });
      await debtRow.getByRole('button', { name: 'Full' }).click();
      await debtRow.getByPlaceholder('Collection notes').fill('E2E final collection');
      const concurrentPage = await page.context().newPage();
      await concurrentPage.goto('/debts');
      const concurrentDebtRow = concurrentPage.getByRole('row').filter({ hasText: debtCustomerName });
      await concurrentDebtRow.getByRole('button', { name: 'Full' }).click();
      await concurrentDebtRow.getByPlaceholder('Collection notes').fill('E2E duplicate final collection');
      await Promise.all([
        debtRow.getByRole('button', { name: 'Record' }).click(),
        concurrentDebtRow.getByRole('button', { name: 'Record' }).click(),
      ]);
      await expect.poll(async () =>
        (await prisma.customerDebt.findUniqueOrThrow({ where: { id: debt.id } })).status,
      ).toBe('PAID');
      await concurrentPage.close();

      const paidDebt = await prisma.customerDebt.findUniqueOrThrow({
        where: { id: debt.id },
        include: { payments: { orderBy: { createdAt: 'asc' } } },
      });
      expect(Number(paidDebt.paidAmount)).toBe(27);
      expect(Number(paidDebt.remainingAmount)).toBe(0);
      expect(paidDebt.paidAt).toBeTruthy();
      expect(paidDebt.payments.map((payment) => Number(payment.amount))).toEqual([10, 17]);
      expect(await prisma.auditLog.count({
        where: {
          referenceId: debt.id,
          actionType: { in: ['DEBT_CREATED', 'DEBT_APPROVED', 'DEBT_PAYMENT_RECORDED'] },
        },
      })).toBe(4);
      expect(Number((await prisma.product.findUniqueOrThrow({
        where: { id: seeded.productIds[2] },
        select: { quantity: true },
      })).quantity)).toBe(19);
    } finally {
      try {
        await seeded?.cleanup();
      } finally {
        try {
          await authUser?.cleanup();
        } finally {
          await profiles.cleanup();
        }
      }
    }
  });

  test('closes a cashier session once with counted cash and manager approval @transaction', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);
      const timestamp = await prisma.timestamp.findFirstOrThrow({
        where: { posTerminalId: seeded.terminalId, timestampOut: null },
        select: { id: true },
      });

      await page.getByRole('button', { name: 'Close', exact: true }).click();
      const closeDialog = page.getByRole('dialog', { name: 'Close Session' });
      await expect(closeDialog).toBeVisible();
      await closeDialog.getByLabel('Counted Cash Amount').fill('1000');
      await closeDialog.getByLabel('Approving Manager PIN').fill('2468');
      const concurrentPage = await page.context().newPage();
      await openSeededPOS(concurrentPage, seeded);
      await concurrentPage.getByRole('button', { name: 'Close', exact: true }).click();
      const concurrentDialog = concurrentPage.getByRole('dialog', { name: 'Close Session' });
      await concurrentDialog.getByLabel('Counted Cash Amount').fill('1000');
      await concurrentDialog.getByLabel('Approving Manager PIN').fill('2468');
      await Promise.all([
        closeDialog.getByRole('button', { name: 'Close Session' }).click(),
        concurrentDialog.getByRole('button', { name: 'Close Session' }).click(),
      ]);
      await expect.poll(async () => {
        const firstClosed = await page.getByRole('heading', { name: 'Session Closed' }).isVisible().catch(() => false);
        const secondClosed = await concurrentPage.getByRole('heading', { name: 'Session Closed' }).isVisible().catch(() => false);
        return firstClosed || secondClosed;
      }, { timeout: 30_000 }).toBe(true);

      const closed = await prisma.timestamp.findUniqueOrThrow({
        where: { id: timestamp.id },
        include: { posTerminal: true },
      });
      expect(closed.timestampOut).toBeTruthy();
      expect(Number(closed.cashOutDrawerAmount)).toBe(1000);
      expect(closed.managerOutId).toBeTruthy();
      expect(closed.posTerminal.isActive).toBe(false);
      expect(await prisma.auditLog.count({
        where: {
          referenceId: timestamp.id,
          actionType: 'CLOSE_SESSION',
        },
      })).toBe(1);

      await concurrentPage.close();

      const doneButton = page.getByRole('button', { name: 'Done' });
      if (await doneButton.isVisible().catch(() => false)) await doneButton.click();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
    } finally {
      try {
        await seeded?.cleanup();
      } finally {
        try {
          await authUser?.cleanup();
        } finally {
          await profiles.cleanup();
        }
      }
    }
  });

  test('keeps cashier tablet app mode out of heavy report routes', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      await page.setViewportSize({ width: 768, height: 1024 });
      await authenticatePageWithCredentials(page, cashierCredentials);

      const baseUrl =
        process.env.PLAYWRIGHT_BASE_URL ??
        `http://127.0.0.1:${Number(process.env.PORT ?? 3000)}`;
      await page.context().addCookies([
        {
          name: POSARD_APP_MODE_COOKIE,
          value: 'tablet-browser',
          url: baseUrl,
        },
      ]);

      await page.goto('/reports/sales');

      await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);
      await expect(page.getByRole('heading', { name: 'Point of Sale' })).toBeVisible();
      await expect(page.getByText(cashierCredentials.email)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sales Reports' })).toHaveCount(0);
    } finally {
      await authUser?.cleanup();
      await profiles.cleanup();
    }
  });
});
