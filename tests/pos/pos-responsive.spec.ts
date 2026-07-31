import { expect, test, type Page } from "@playwright/test";

import { prisma } from "../../lib/prisma";
import { POSARD_APP_MODE_COOKIE } from "../../lib/mobile-app-mode";
import {
  authenticatePageWithCredentials,
  cashierCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from "../fixtures/auth.fixture";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

type SeededPOSSession = {
  companyId: string;
  productIds: string[];
  productNames: string[];
  terminalId: string;
  timestampId: string;
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
          categoryName:
            `E2E POS RESPONSIVE CATEGORY ${index + 1} ${testId}`.toUpperCase(),
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
          baseUnit: "PCS",
          quantity: 20,
          cost: 10,
          price: 25 + index,
          isAvailable: true,
          trackInventory: true,
          itemType: "RESALE",
          vatType: "VATABLE",
          categoryId:
            index === responsiveProductCount - 1
              ? categories[1].id
              : categories[0].id,
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
      dateIssued: new Date("2024-01-01"),
      validUntil: new Date("2035-01-01"),
      posName: `E2E POS ${testId}`,
      registeredName: "E2E POSard",
      operatedBy: "E2E POSard",
      address: "E2E Test Address",
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

  const paymentMethod = await prisma.saleType.create({
    data: {
      companyId: cashier.companyId,
      name: `E2E GCash ${testId}`,
      type: "EPAYMENT",
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
  const productIds = products.map((product) => product.id);
  const productNames = products.map((product) => product.name);

  return {
    companyId: cashier.companyId,
    productIds,
    productNames,
    terminalId: terminal.id,
    timestampId: timestamp.id,
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
            OR: [{ terminalId: terminal.id }, { sourceId: { in: invoiceIds } }],
          },
        });
        await prisma.inventory.deleteMany({
          where: { productId: { in: productIds } },
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
      await prisma.stockLot.deleteMany({ where: { productId: { in: productIds } } });
      await prisma.product.deleteMany({
        where: { id: { in: productIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: categories.map((category) => category.id) } },
      });
      await prisma.posTerminalInfo.deleteMany({ where: { id: terminal.id } });
      await prisma.saleType.deleteMany({ where: { id: paymentMethod.id } });
    },
  };
}

async function openSeededPOS(page: Page, seeded: SeededPOSSession) {
  await authenticatePageWithCredentials(page, cashierCredentials);
  const bootstrapFinished = page
    .waitForResponse(
      (response) =>
        response.url().includes("/api/sync/bootstrap") &&
        response.request().method() === "GET",
      { timeout: 45_000 },
    )
    .catch(() => null);
  await page.goto("/pos");
  await bootstrapFinished;

  await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);
  await expect(page.getByTestId("pos-shell")).toBeVisible({ timeout: 30_000 });
  const productSearch = page.getByPlaceholder(
    "Search name, barcode, generic, brand...",
  );
  await expect(productSearch).toBeVisible();
  await productSearch.fill(seeded.productNames[0]);
  const seededProduct = page.getByText(seeded.productNames[0]);
  if (
    !(await seededProduct.isVisible({ timeout: 15_000 }).catch(() => false))
  ) {
    await page.reload();
    await expect(productSearch).toBeVisible({ timeout: 30_000 });
    await productSearch.fill(seeded.productNames[0]);
  }
  await expect(seededProduct).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/\d+ categories/)).toBeVisible();
}

test("double-clicking Complete Sale creates one invoice and one stock deduction @transaction @destructive", async ({
  page,
}) => {
  test.setTimeout(180_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  let seeded: SeededPOSSession | null = null;

  try {
    authUser = await ensureAuthUserForProfile(cashierCredentials);
    seeded = await seedActivePOSSession();
    await authenticatePageWithCredentials(page, cashierCredentials);
    await openSeededPOS(page, seeded);

    await page.getByText(seeded.productNames[0], { exact: true }).click();
    await page.getByRole("button", { name: /Checkout|Go to Tender/i }).click();
    await page.getByRole("button", { name: "Exact" }).click();

    const invoiceCountBefore = await prisma.invoice.count({
      where: { posTerminalId: seeded.terminalId },
    });
    const productBefore = await prisma.product.findUniqueOrThrow({
      where: { id: seeded.productIds[0] },
      select: { quantity: true },
    });
    const completeSale = page.getByRole("button", { name: "Complete Sale", exact: true });

    await Promise.all([completeSale.click(), completeSale.click()]);
    await expect(page.getByText("Transaction Done")).toBeVisible({ timeout: 45_000 });

    await expect.poll(async () =>
      prisma.invoice.count({ where: { posTerminalId: seeded!.terminalId } }),
    ).toBe(invoiceCountBefore + 1);
    await expect.poll(async () =>
      Number((await prisma.product.findUniqueOrThrow({
        where: { id: seeded!.productIds[0] },
        select: { quantity: true },
      })).quantity),
    ).toBe(Number(productBefore.quantity) - 1);

    expect(await prisma.invoice.count({ where: { posTerminalId: seeded.terminalId } })).toBe(
      invoiceCountBefore + 1,
    );
    expect(
      await prisma.auditLog.count({
        where: { companyId: seeded.companyId, actionType: "SALE_COMPLETED" },
      }),
    ).toBeGreaterThanOrEqual(1);
  } finally {
    if (seeded) await seeded.cleanup();
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});

async function collectLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
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
      document.querySelectorAll<HTMLElement>(
        '[data-testid^="pos-mobile-tab-"]',
      ),
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
      productScrollVisible: productScroll
        ? productScroll.getClientRects().length > 0 &&
          getComputedStyle(productScroll).display !== "none"
        : false,
      cartItemsClientHeight: cartItems?.clientHeight ?? 0,
      cartItemsVisible: cartItems
        ? cartItems.getClientRects().length > 0 &&
          getComputedStyle(cartItems).display !== "none"
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
  expectedMobilePanel?: "menu" | "cart" | "tender",
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

    if (expectedMobilePanel === "menu") {
      expect(metrics.productScrollVisible).toBe(true);
      expect(metrics.productScrollClientHeight).toBeGreaterThan(0);
    }

    if (expectedMobilePanel === "cart") {
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

test.describe("POS responsive layout @smoke", () => {
  test("keeps the active POS layout inside the viewport across desktop and mobile tabs", async ({
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
        await page.evaluate(() => new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ));

        const firstState = await expectViewportContained(page);

        await page.getByRole("button", { name: "Toggle Sidebar" }).click();
        await page.evaluate(() => new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ));

        const secondState = await expectViewportContained(page);

        expect(secondState.cartColumnWidth).toBe(firstState.cartColumnWidth);
      }

      for (const viewport of mobileViewports) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ));

        if (viewport.width < 768) {
          await openSeededPOS(page, seeded);
          await page.getByTestId("pos-mobile-tab-menu").click();
          await expect(page.getByText(seeded.productNames[0])).toBeVisible();
          await expectViewportContained(page, "menu");

          await page.getByText(seeded.productNames[0]).click();
          await expect(
            page.getByTestId("pos-mobile-order-summary"),
          ).toContainText(/item/);

          await page.getByTestId("pos-mobile-tab-cart").click();
          await expect(page.getByTestId("pos-cart-items")).toContainText(
            seeded.productNames[0],
          );
          await expectViewportContained(page, "cart");

          await page.getByRole("button", { name: /Go to Tender/i }).click();
          await page.getByRole("button", { name: "Exact" }).click();
          await expect(
            page.getByRole("button", { name: /Complete Sale/i }),
          ).toBeVisible();
          await expectViewportContained(page, "tender");

          const invoiceCountBefore = await prisma.invoice.count({
            where: { posTerminalId: seededTerminalId },
          });
          const productBefore = await prisma.product.findUniqueOrThrow({
            where: { id: seededProductId },
            select: { quantity: true },
          });

          await page.getByRole("button", { name: /Complete Sale/i }).click();
          await expect(page.getByText("Transaction Done")).toBeVisible({
            timeout: 30_000,
          });

          const savedInvoice = await expect
            .poll(
              async () => {
                const invoice = await prisma.invoice.findFirst({
                  where: { posTerminalId: seededTerminalId },
                  orderBy: { createdAt: "desc" },
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
              },
              { timeout: 45_000 },
            )
            .not.toBeNull()
            .then(async () => {
              return prisma.invoice.findFirstOrThrow({
                where: { posTerminalId: seededTerminalId },
                orderBy: { createdAt: "desc" },
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

          expect(
            await prisma.invoice.count({
              where: { posTerminalId: seededTerminalId },
            }),
          ).toBe(invoiceCountBefore + 1);
          soldInvoiceId = savedInvoice.id;
          expect(savedInvoice.status).toBe("PAID");
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
            status: "PAID",
          });
          expect(Number(savedInvoice.items[0].qty)).toBe(1);
          expect(Number(savedInvoice.items[0].price)).toBe(25);
          expect(Number(savedInvoice.items[0].subTotal)).toBe(25);

          await expect
            .poll(async () => {
              const product = await prisma.product.findUniqueOrThrow({
                where: { id: seededProductId },
                select: { quantity: true },
              });
              return Number(product.quantity);
            })
            .toBe(Number(productBefore.quantity) - 1);

          await expect
            .poll(() =>
              prisma.auditLog.count({
                where: {
                  posTerminalId: seededTerminalId,
                  referenceId: savedInvoice.id,
                },
              }),
            )
            .toBeGreaterThan(0);
          await expectReceiptSheetContained(page);
          await page.getByRole("button", { name: /New Checkout/i }).click();
          await expect(page.getByTestId("pos-mobile-tab-menu")).toBeVisible();
          await expectViewportContained(page, "menu");
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
      await page.getByRole("button", { name: "Return", exact: true }).click();
      const returnDialog = page.getByRole("dialog");
      const returnQuantity = returnDialog.locator('input[type="number"]');
      await returnQuantity.fill("999");
      await expect(returnQuantity).toHaveValue("1");
      await page.getByLabel("Reason").selectOption("Wrong item");
      await page.getByLabel("Manager PIN").fill("0000");
      await page.getByLabel("Notes").fill("E2E invalid approval attempt");
      await page.getByRole("button", { name: "Confirm Return" }).click();
      await expect(page.getByText(/Invalid Manager PIN/i)).toBeVisible();
      expect(
        await prisma.invoiceReturn.count({
          where: { invoiceId: soldInvoiceId! },
        }),
      ).toBe(0);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productIds[0] },
            })
          ).quantity,
        ),
      ).toBe(19);

      await returnQuantity.fill("0.5");
      await page.getByLabel("Manager PIN").fill("2468");
      await page.getByLabel("Notes").fill("E2E reconciled partial return");
      await page.getByRole("button", { name: "Confirm Return" }).click();
      await expect(page.getByText(/Return R-\d+ recorded\./)).toBeVisible();

      const partiallyReturnedInvoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: soldInvoiceId! },
        include: {
          items: { include: { returnItems: true } },
          returns: { include: { items: true } },
        },
      });
      expect(partiallyReturnedInvoice.status).toBe("PAID");
      expect(Number(partiallyReturnedInvoice.returnedAmount)).toBe(12.5);
      expect(partiallyReturnedInvoice.items[0].status).toBe("PAID");
      expect(
        Number(partiallyReturnedInvoice.items[0].returnItems[0].returnedQty),
      ).toBe(0.5);
      expect(partiallyReturnedInvoice.returns).toHaveLength(1);
      expect(partiallyReturnedInvoice.returns[0].returnType).toBe("PARTIAL");
      expect(Number(partiallyReturnedInvoice.returns[0].totalReturned)).toBe(
        12.5,
      );
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productIds[0] },
            })
          ).quantity,
        ),
      ).toBe(19.5);

      await page.reload();
      await expect(page.getByText(seeded.productNames[0])).toBeVisible({
        timeout: 45_000,
      });
      await page.getByRole("button", { name: "Return", exact: true }).click();
      await page.getByRole("button", { name: "Full Remaining" }).click();
      await page.getByLabel("Reason").selectOption("Wrong item");
      await page.getByLabel("Manager PIN").fill("2468");
      await page.getByLabel("Notes").fill("E2E reconciled final return");
      await page.getByRole("button", { name: "Confirm Return" }).click();
      await expect(page.getByText(/Return R-\d+ recorded\./)).toBeVisible();

      const returnedInvoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: soldInvoiceId! },
        include: {
          items: { include: { returnItems: true } },
          returns: { include: { items: true } },
        },
      });
      expect(returnedInvoice.status).toBe("RETURNED");
      expect(Number(returnedInvoice.returnedAmount)).toBe(25);
      expect(returnedInvoice.items[0].status).toBe("RETURNED");
      expect(
        returnedInvoice.items[0].returnItems.map((item) =>
          Number(item.returnedQty),
        ),
      ).toEqual([0.5, 0.5]);
      expect(returnedInvoice.returns).toHaveLength(2);
      expect(returnedInvoice.returns.map((item) => item.returnType)).toEqual([
        "PARTIAL",
        "FULL",
      ]);
      expect(
        returnedInvoice.returns.map((item) => Number(item.totalReturned)),
      ).toEqual([12.5, 12.5]);
      expect(
        returnedInvoice.returns.map((item) => Number(item.items[0].lineAmount)),
      ).toEqual([12.5, 12.5]);

      const returnedInvoiceLabel = `#${String(returnedInvoice.invoiceNumber).padStart(12, "0")}`;
      await page.goto(
        `/reports/sales?companyId=${seeded.companyId}&terminalId=${seeded.terminalId}&preset=today&status=RETURNED`,
      );
      await expect(page.getByText(returnedInvoiceLabel, { exact: true })).toBeVisible({
        timeout: 45_000,
      });

      const restoredProduct = await prisma.product.findUniqueOrThrow({
        where: { id: seeded.productIds[0] },
        select: { quantity: true },
      });
      expect(Number(restoredProduct.quantity)).toBe(20);
      await expect
        .poll(async () => ({
          partial: await prisma.auditLog.count({
            where: {
              referenceId: soldInvoiceId!,
              actionType: "INVOICE_RETURNED_PARTIAL",
            },
          }),
          full: await prisma.auditLog.count({
            where: {
              referenceId: soldInvoiceId!,
              actionType: "INVOICE_RETURNED_FULL",
            },
          }),
          approvals: await prisma.auditLog.count({
            where: {
              referenceId: soldInvoiceId!,
              actionType: "RETURN_APPROVED",
            },
          }),
        }))
        .toEqual({ partial: 1, full: 1, approvals: 2 });

      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);
      const productSearch = page.getByPlaceholder(
        "Search name, barcode, generic, brand...",
      );
      await productSearch.fill(seeded.productNames[1]);
      await page.getByText(seeded.productNames[1]).click();
      await expect(page.getByTestId("pos-cart-items")).toContainText(
        seeded.productNames[1],
      );
      await page.getByRole("button", { name: "Void", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Reason" })
        .fill("E2E cancelled before payment");
      await page.getByRole("button", { name: "Continue" }).click();
      const invoiceCountBeforeInvalidVoid = await prisma.invoice.count({
        where: { posTerminalId: seeded.terminalId },
      });
      await page.locator("#managerPin").pressSequentially("0000");
      await page.getByRole("button", { name: "Authorize" }).click();
      await expect(page.getByText(/Invalid Manager PIN/i)).toBeVisible();
      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(invoiceCountBeforeInvalidVoid);
      await page.locator("#managerPin").pressSequentially("2468");
      await page.getByRole("button", { name: "Authorize" }).click();
      await expect(
        page.getByText("Order cancelled successfully."),
      ).toBeVisible();

      const voidInvoice = await prisma.invoice.findFirstOrThrow({
        where: { posTerminalId: seeded.terminalId, status: "VOID" },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      });
      expect(Number(voidInvoice.grossAmount)).toBe(26);
      expect(Number(voidInvoice.totalAmount)).toBe(0);
      expect(Number(voidInvoice.totalTendered)).toBe(0);
      expect(voidInvoice.reason).toBe("E2E cancelled before payment");
      expect(voidInvoice.items).toHaveLength(1);
      expect(voidInvoice.items[0].status).toBe("VOID");
      expect(Number(voidInvoice.items[0].subTotal)).toBe(0);
      expect(
        await prisma.auditLog.count({
          where: { referenceId: voidInvoice.id, actionType: "ORDER_VOIDED" },
        }),
      ).toBe(1);
      const voidedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: seeded.productIds[1] },
        select: { quantity: true },
      });
      expect(Number(voidedProduct.quantity)).toBe(20);

      await authenticatePageWithCredentials(page, managerCredentials);
      await page.goto(
        `/reports/voided?companyId=${seeded.companyId}&terminalId=${seeded.terminalId}&preset=today`,
      );
      await expect(
        page.getByText(`#${String(voidInvoice.invoiceNumber).padStart(12, "0")}`, {
          exact: true,
        }),
      ).toBeVisible({ timeout: 45_000 });
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

  test("searches, filters, edits, and manager-removes cart items @transaction", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1280, height: 800 });
      await openSeededPOS(page, seeded);

      const search = page.getByPlaceholder(
        "Search name, barcode, generic, brand...",
      );
      await search.fill(seeded.productNames[0]);
      await expect(page.getByText(seeded.productNames[0])).toBeVisible();
      await expect(page.getByText(seeded.productNames[1])).toHaveCount(0);

      await search.fill(
        (
          await prisma.product.findUniqueOrThrow({
            where: { id: seeded.productIds[1] },
            select: { barcode: true },
          })
        ).barcode!,
      );
      await expect(page.getByText(seeded.productNames[1])).toBeVisible();
      await expect(page.getByText(seeded.productNames[0])).toHaveCount(0);

      await search.fill("");
      const isolatedCategory = await prisma.category.findFirstOrThrow({
        where: { products: { some: { id: seeded.productIds.at(-1)! } } },
        select: { categoryName: true },
      });
      await page
        .getByRole("button", {
          name: isolatedCategory.categoryName!,
          exact: true,
        })
        .click();
      await expect(page.getByText(seeded.productNames.at(-1)!)).toBeVisible();
      await expect(page.getByText(seeded.productNames[0])).toHaveCount(0);

      await page.getByText("Clear Filter", { exact: true }).click();
      await expect(page.getByText("Clear Filter", { exact: true })).toHaveCount(
        0,
      );
      await search.fill(seeded.productNames[0]);
      const addToCart = page.getByRole("button", {
        name: "Add to Cart",
        exact: true,
      });
      await expect(addToCart).toHaveCount(1);
      await addToCart.click();
      const cartItems = page.getByTestId("pos-cart-items");
      await expect(cartItems).toContainText(seeded.productNames[0]);
      const quantityInput = cartItems.locator('input[type="number"]').nth(1);
      await quantityInput.fill("2");
      await expect(quantityInput).toHaveValue("2");
      await expect(page.getByText("1 Item", { exact: true })).toBeVisible();

      await quantityInput.fill("-1");
      await expect(page.getByText("0 Items", { exact: true })).toBeVisible();
      await expect(cartItems).toContainText("Voided");
      await expect(
        page.getByRole("button", { name: "Checkout", exact: true }),
      ).toBeDisabled();

      await addToCart.click();
      await expect(page.getByText("1 Item", { exact: true })).toBeVisible();
      await cartItems.locator("button").last().click();
      const approval = page.getByRole("dialog", {
        name: "Manager Approval Required",
      });
      await approval.locator("#managerPin").pressSequentially("0000");
      await approval.getByRole("button", { name: "Authorize" }).click();
      await expect(approval).toContainText(/Invalid manager PIN/i);
      await expect(page.getByText("1 Item", { exact: true })).toBeVisible();
      await approval.locator("#managerPin").pressSequentially("2468");
      await approval.getByRole("button", { name: "Authorize" }).click();
      await expect(page.getByText("0 Items", { exact: true })).toBeVisible();
      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(0);
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

  test("reconciles capped and statutory order discounts with exact VAT rounding @transaction", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();

      const completeDiscountSale = async (input: {
        productName: string;
        discountLabel: "Max Discount" | "Senior (20% + VAT Exempt)";
        customerName?: string;
        idNumber?: string;
      }) => {
        const invoiceCountBefore = await prisma.invoice.count({
          where: { posTerminalId: seeded!.terminalId, status: "PAID" },
        });
        await openSeededPOS(page, seeded!);
        const search = page.getByPlaceholder(
          "Search name, barcode, generic, brand...",
        );
        await search.fill(input.productName);
        await page.getByText(input.productName, { exact: true }).first().click();
        await page.getByRole("button", { name: "Checkout", exact: true }).click();
        const checkout = page.getByRole("dialog", { name: "Checkout" });
        await checkout.getByRole("button", { name: "None", exact: true }).click();
        await page
          .getByRole("menuitemradio", { name: input.discountLabel, exact: true })
          .click();

        if (input.customerName && input.idNumber) {
          await checkout.getByLabel("Customer Name").fill(input.customerName);
          await checkout.getByLabel("OSCA / PWD ID Number").fill(input.idNumber);
        }

        await checkout.getByRole("button", { name: "Exact", exact: true }).click();
        await checkout
          .getByRole("button", { name: "Complete Sale", exact: true })
          .click();
        const approval = page.getByRole("dialog", {
          name: "Manager Approval Required",
        });
        await approval.locator("#managerPin").pressSequentially("2468");
        await approval.getByRole("button", { name: "Authorize" }).click();
        await expect(page.getByText("Transaction Done")).toBeVisible({
          timeout: 30_000,
        });

        await expect
          .poll(
            () =>
              prisma.invoice.count({
                where: { posTerminalId: seeded!.terminalId, status: "PAID" },
              }),
            { timeout: 90_000 },
          )
          .toBe(invoiceCountBefore + 1);
        return prisma.invoice.findFirstOrThrow({
          where: { posTerminalId: seeded!.terminalId, status: "PAID" },
          orderBy: { createdAt: "desc" },
        });
      };

      await prisma.posTerminalInfo.update({
        where: { id: seeded.terminalId },
        data: { discountCapType: "percent", discountMax: 10 },
      });
      const percentage = await completeDiscountSale({
        productName: seeded.productNames[0],
        discountLabel: "Max Discount",
      });
      expect(Number(percentage.grossAmount)).toBe(25);
      expect(Number(percentage.discountAmount)).toBe(2.5);
      expect(Number(percentage.totalAmount)).toBe(22.5);
      expect(Number(percentage.subTotal) + Number(percentage.vatAmount)).toBe(
        Number(percentage.totalAmount),
      );

      await prisma.posTerminalInfo.update({
        where: { id: seeded.terminalId },
        data: { discountCapType: "amount", discountMax: 3 },
      });
      const fixed = await completeDiscountSale({
        productName: seeded.productNames[1],
        discountLabel: "Max Discount",
      });
      expect(Number(fixed.grossAmount)).toBe(26);
      expect(Number(fixed.discountAmount)).toBe(3);
      expect(Number(fixed.totalAmount)).toBe(23);
      expect(Number(fixed.subTotal) + Number(fixed.vatAmount)).toBe(
        Number(fixed.totalAmount),
      );

      const senior = await completeDiscountSale({
        productName: seeded.productNames[2],
        discountLabel: "Senior (20% + VAT Exempt)",
        customerName: "E2E Senior Customer",
        idNumber: "E2E-OSCA-ROUNDING",
      });
      expect(Number(senior.grossAmount)).toBe(27);
      expect(Number(senior.discountAmount)).toBe(7.71);
      expect(Number(senior.totalAmount)).toBe(19.29);
      expect(Number(senior.vatAmount)).toBe(0);
      expect(Number(senior.vatExempt)).toBe(24.11);
      expect(senior.discountType).toBe("SENIOR");
      expect(senior.eligibleDiscName).toBe("E2E Senior Customer");
      expect(senior.oscaIdNum).toBe("E2E-OSCA-ROUNDING");
      expect(
        await prisma.auditLog.count({
          where: {
            referenceId: { in: [percentage.id, fixed.id, senior.id] },
            actionType: "DISCOUNT_APPROVED",
          },
        }),
      ).toBe(3);
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

  test("sells tracked, untracked, out-of-stock, and configured modifier items @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const untrackedName = `E2E UNTRACKED ${suffix}`;
      const outOfStockName = `E2E OUT OF STOCK ${suffix}`;
      const configuredName = `E2E CONFIGURED ${suffix}`;
      const expiredName = `E2E EXPIRED LOT ${suffix}`;
      const seededCategory = await prisma.product.findUniqueOrThrow({
        where: { id: seeded.productIds[0] },
        select: { categoryId: true },
      });

      const [untracked, outOfStock, configured, expired] = await Promise.all([
        prisma.product.create({
          data: {
            companyId: seeded.companyId,
            name: untrackedName,
            barcode: `UNTRACKED-${suffix}`,
            baseUnit: "PCS",
            quantity: 0,
            cost: 5,
            price: 11,
            isAvailable: true,
            trackInventory: false,
            itemType: "RESALE",
            vatType: "VATABLE",
            categoryId: seededCategory.categoryId,
          },
          select: { id: true, name: true },
        }),
        prisma.product.create({
          data: {
            companyId: seeded.companyId,
            name: outOfStockName,
            barcode: `OUT-${suffix}`,
            baseUnit: "PCS",
            quantity: 0,
            cost: 5,
            price: 13,
            isAvailable: true,
            trackInventory: true,
            itemType: "RESALE",
            vatType: "VATABLE",
            categoryId: seededCategory.categoryId,
          },
          select: { id: true, name: true },
        }),
        prisma.product.create({
          data: {
            companyId: seeded.companyId,
            name: configuredName,
            barcode: `CONFIGURED-${suffix}`,
            baseUnit: "PCS",
            quantity: 0,
            cost: 8,
            price: 20,
            isAvailable: true,
            trackInventory: false,
            isConfigurable: true,
            itemType: "RESALE",
            vatType: "VATABLE",
            categoryId: seededCategory.categoryId,
            modifierGroups: {
              create: {
                modifierGroup: {
                  create: {
                    companyId: seeded.companyId,
                    name: `E2E SIZE ${suffix}`,
                    type: "MODIFIER",
                    required: true,
                    minSelect: 1,
                    maxSelect: 1,
                    options: {
                      create: [
                        { name: "Regular", priceDelta: 0 },
                        { name: "Large", priceDelta: 2 },
                      ],
                    },
                  },
                },
              },
            },
          },
          select: { id: true, name: true },
        }),
        prisma.product.create({
          data: {
            companyId: seeded.companyId,
            name: expiredName,
            barcode: `EXPIRED-${suffix}`,
            baseUnit: "PCS",
            quantity: 1,
            cost: 5,
            price: 17,
            isAvailable: true,
            trackInventory: true,
            itemType: "RESALE",
            vatType: "VATABLE",
            categoryId: seededCategory.categoryId,
            stockLots: {
              create: {
                companyId: seeded.companyId,
                batchNumber: `EXPIRED-BATCH-${suffix}`,
                expiryDate: new Date("2020-01-01T00:00:00.000Z"),
                unitCost: 5,
                initialQuantity: 1,
                quantityOnHand: 1,
                status: "available",
              },
            },
          },
          select: { id: true, name: true },
        }),
      ]);
      seeded.productIds.push(untracked.id, outOfStock.id, configured.id, expired.id);
      seeded.productNames.push(untracked.name, outOfStock.name, configured.name, expired.name);
      await prisma.posTerminalInfo.update({
        where: { id: seeded.terminalId },
        data: { enableProductModifiers: true },
      });

      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);
      const search = page.getByPlaceholder(
        "Search name, barcode, generic, brand...",
      );

      await search.fill(untrackedName);
      await page.getByText(untrackedName, { exact: true }).first().click();
      await expect(page.getByTestId("pos-cart-items")).toContainText(untrackedName);

      await search.fill(outOfStockName);
      await page.getByText(outOfStockName, { exact: true }).first().click();
      await expect(page.getByText("Wala nang stock.")).toBeVisible();
      await expect(page.getByTestId("pos-cart-items")).not.toContainText(
        outOfStockName,
      );

      await search.fill(expiredName);
      await expect(page.getByText("Expired stock", { exact: true })).toBeVisible();
      await page.getByText(expiredName, { exact: true }).first().click();
      await expect(page.getByText("Expired batch only.")).toBeVisible();
      await expect(page.getByTestId("pos-cart-items")).not.toContainText(expiredName);

      await search.fill(configuredName);
      await page.getByText(configuredName, { exact: true }).first().click();
      const configuration = page.getByRole("dialog", { name: configuredName });
      await configuration.getByRole("button", { name: "Add Item" }).click();
      await expect(configuration).toContainText("requires at least 1 selection");
      await configuration.getByText("Large", { exact: true }).click();
      await expect(configuration).toContainText("Total: PHP 22.00");
      await configuration.getByRole("button", { name: "Add Item" }).click();
      await expect(page.getByTestId("pos-cart-items")).toContainText(configuredName);

      await page.getByRole("button", { name: "Checkout", exact: true }).click();
      await page.getByRole("button", { name: "Exact" }).click();
      await page.getByRole("button", { name: "Complete Sale" }).click();
      await expect(page.getByText("Transaction Done")).toBeVisible({
        timeout: 30_000,
      });

      const invoice = await expect
        .poll(
          () =>
            prisma.invoice.findFirst({
              where: { posTerminalId: seeded!.terminalId },
              orderBy: { createdAt: "desc" },
              include: { items: { include: { selections: true } } },
            }),
          { timeout: 45_000 },
        )
        .not.toBeNull()
        .then(() =>
          prisma.invoice.findFirstOrThrow({
            where: { posTerminalId: seeded!.terminalId },
            orderBy: { createdAt: "desc" },
            include: { items: { include: { selections: true } } },
          }),
        );

      expect(Number(invoice.totalAmount)).toBe(33);
      expect(invoice.items).toHaveLength(2);
      const configuredItem = invoice.items.find(
        (item) => item.productId === configured.id,
      );
      expect(Number(configuredItem?.subTotal)).toBe(22);
      expect(configuredItem?.selections).toHaveLength(1);
      expect(configuredItem?.selections[0]).toMatchObject({
        modifierGroupType: "MODIFIER",
        optionName: "Large",
      });
      expect(Number(configuredItem?.selections[0].priceDelta)).toBe(2);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: untracked.id },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(0);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: expired.id },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(1);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: outOfStock.id },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(0);
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

  test("creates an approved debt sale and reconciles partial and final collections @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);

      const debtCustomerName = `E2E Debt Customer ${Date.now()}`;
      const productSearch = page.getByPlaceholder(
        "Search name, barcode, generic, brand...",
      );
      await productSearch.fill(seeded.productNames[2]);
      await page.getByText(seeded.productNames[2]).click();
      await page.getByRole("button", { name: "Checkout", exact: true }).click();
      await page.getByRole("button", { name: "Record as Utang" }).click();
      await page.getByPlaceholder("Add customer name").fill(debtCustomerName);
      await page.locator('input[type="date"]').fill("2030-01-31");
      await page
        .getByPlaceholder("Optional debt notes")
        .fill("E2E debt lifecycle");
      await page.getByRole("button", { name: "Complete Sale" }).click();
      await page.locator("#managerPin").pressSequentially("2468");
      await page.getByRole("button", { name: "Authorize" }).click();

      const transactionDone = page.getByText("Transaction Done");
      const errorToast = page
        .locator('[data-sonner-toast][data-type="error"]')
        .last();
      await expect
        .poll(
          async () => {
            if (await transactionDone.isVisible().catch(() => false))
              return "done";
            if (await errorToast.isVisible().catch(() => false)) {
              return `error:${await errorToast.innerText()}`;
            }
            return "pending";
          },
          { timeout: 30_000 },
        )
        .toBe("done");

      const debt = await prisma.customerDebt.findFirstOrThrow({
        where: {
          companyId: seeded.companyId,
          customer: { name: debtCustomerName },
        },
        include: { invoice: { include: { items: true } } },
      });
      expect(debt.status).toBe("UNPAID");
      expect(Number(debt.originalAmount)).toBe(27);
      expect(Number(debt.paidAmount)).toBe(0);
      expect(Number(debt.remainingAmount)).toBe(27);
      expect(debt.invoice.status).toBe("PENDING");
      expect(Number(debt.invoice.cashTendered)).toBe(0);
      expect(Number(debt.invoice.totalTendered)).toBe(0);
      expect(debt.invoice.items[0].status).toBe("PENDING");

      await page.goto("/debts");
      let debtRow = page.getByRole("row").filter({ hasText: debtCustomerName });
      await expect(debtRow).toBeVisible({ timeout: 30_000 });
      await debtRow.getByPlaceholder("Amount").fill("10");
      await debtRow
        .getByPlaceholder("Collection notes")
        .fill("E2E partial collection");
      await debtRow.getByRole("button", { name: "Record" }).click();
      await expect(page.getByText("Debt payment recorded.")).toBeVisible();
      await expect
        .poll(async () => {
          const updated = await prisma.customerDebt.findUniqueOrThrow({
            where: { id: debt.id },
          });
          return {
            status: updated.status,
            paid: Number(updated.paidAmount),
            remaining: Number(updated.remainingAmount),
          };
        })
        .toEqual({ status: "PARTIAL", paid: 10, remaining: 17 });

      await debtRow.getByPlaceholder("Amount").fill("18");
      await debtRow
        .getByPlaceholder("Collection notes")
        .fill("E2E rejected overpayment");
      await debtRow.getByRole("button", { name: "Record" }).click();
      await expect(
        page.getByText("Payment amount cannot exceed the remaining balance."),
      ).toBeVisible();
      const debtAfterRejectedOverpayment =
        await prisma.customerDebt.findUniqueOrThrow({
          where: { id: debt.id },
          include: { payments: true },
        });
      expect(Number(debtAfterRejectedOverpayment.paidAmount)).toBe(10);
      expect(Number(debtAfterRejectedOverpayment.remainingAmount)).toBe(17);
      expect(debtAfterRejectedOverpayment.payments).toHaveLength(1);

      await page.reload();
      debtRow = page.getByRole("row").filter({ hasText: debtCustomerName });
      await debtRow.getByRole("button", { name: "Full" }).click();
      await debtRow
        .getByPlaceholder("Collection notes")
        .fill("E2E final collection");
      const concurrentPage = await page.context().newPage();
      await concurrentPage.goto("/debts");
      const concurrentDebtRow = concurrentPage
        .getByRole("row")
        .filter({ hasText: debtCustomerName });
      await concurrentDebtRow.getByRole("button", { name: "Full" }).click();
      await concurrentDebtRow
        .getByPlaceholder("Collection notes")
        .fill("E2E duplicate final collection");
      await Promise.all([
        debtRow.getByRole("button", { name: "Record" }).click(),
        concurrentDebtRow.getByRole("button", { name: "Record" }).click(),
      ]);
      await expect
        .poll(
          async () =>
            (
              await prisma.customerDebt.findUniqueOrThrow({
                where: { id: debt.id },
              })
            ).status,
        )
        .toBe("PAID");
      await concurrentPage.close();

      const paidDebt = await prisma.customerDebt.findUniqueOrThrow({
        where: { id: debt.id },
        include: { payments: { orderBy: { createdAt: "asc" } } },
      });
      expect(Number(paidDebt.paidAmount)).toBe(27);
      expect(Number(paidDebt.remainingAmount)).toBe(0);
      expect(paidDebt.paidAt).toBeTruthy();
      expect(
        paidDebt.payments.map((payment) => Number(payment.amount)),
      ).toEqual([10, 17]);
      expect(
        await prisma.auditLog.count({
          where: {
            referenceId: debt.id,
            actionType: {
              in: ["DEBT_CREATED", "DEBT_APPROVED", "DEBT_PAYMENT_RECORDED"],
            },
          },
        }),
      ).toBe(4);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productIds[2] },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(19);

      await page.goto("/dashboard");
      await expect(page.getByText("Collected Today", { exact: true }).locator("..")).toContainText("₱27.00");
      await expect(page.getByText("Debt Outstanding", { exact: true }).locator("..")).toContainText("₱0.00");
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

  test("validates and persists split and full reference payments @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);

      const checkoutProduct = async (name: string) => {
        const productSearch = page.getByPlaceholder(
          "Search name, barcode, generic, brand...",
        );
        await productSearch.fill(name);
        await page.getByText(name).click();
        await page
          .getByRole("button", { name: "Checkout", exact: true })
          .click();
      };

      const splitReference = `E2E-SPLIT-${Date.now()}`;
      await checkoutProduct(seeded.productNames[0]);
      const completeSale = page.getByRole("button", { name: "Complete Sale" });
      const cashReceived = page.locator("#split-cash-dialog");
      await cashReceived.fill("10");
      await expect(completeSale).toBeDisabled();
      await page.getByRole("button", { name: "Add Reference" }).click();
      await expect(completeSale).toBeDisabled();
      await page.getByPlaceholder("Transaction reference").fill(splitReference);
      await expect(completeSale).toBeEnabled();
      await completeSale.click();
      await expect(page.getByText("Transaction Done")).toBeVisible({
        timeout: 30_000,
      });

      const splitInvoice = await expect
        .poll(
          () =>
            prisma.invoice.findFirst({
              where: { posTerminalId: seeded!.terminalId },
              orderBy: { createdAt: "desc" },
              include: { ePayments: { include: { saleType: true } } },
            }),
          { timeout: 45_000 },
        )
        .not.toBeNull()
        .then(() =>
          prisma.invoice.findFirstOrThrow({
            where: { posTerminalId: seeded!.terminalId },
            orderBy: { createdAt: "desc" },
            include: { ePayments: { include: { saleType: true } } },
          }),
        );
      expect(Number(splitInvoice.totalAmount)).toBe(25);
      expect(Number(splitInvoice.cashTendered)).toBe(10);
      expect(Number(splitInvoice.totalTendered)).toBe(25);
      expect(splitInvoice.ePayments).toHaveLength(1);
      expect(Number(splitInvoice.ePayments[0].amount)).toBe(15);
      expect(splitInvoice.ePayments[0].reference).toBe(splitReference);
      expect(splitInvoice.ePayments[0].saleType.type).toBe("EPAYMENT");

      await page.getByRole("button", { name: /New Checkout/i }).click();
      const fullReference = `E2E-FULL-${Date.now()}`;
      await checkoutProduct(seeded.productNames[1]);
      await page.getByRole("button", { name: "Add Reference" }).click();
      await page.getByPlaceholder("Transaction reference").fill(fullReference);
      await expect(completeSale).toBeEnabled();
      await completeSale.click();
      await expect(page.getByText("Transaction Done")).toBeVisible({
        timeout: 30_000,
      });

      const fullInvoice = await expect
        .poll(
          () =>
            prisma.invoice.findFirst({
              where: {
                posTerminalId: seeded!.terminalId,
                id: { not: splitInvoice.id },
              },
              orderBy: { createdAt: "desc" },
              include: { ePayments: true },
            }),
          { timeout: 45_000 },
        )
        .not.toBeNull()
        .then(() =>
          prisma.invoice.findFirstOrThrow({
            where: {
              posTerminalId: seeded!.terminalId,
              id: { not: splitInvoice.id },
            },
            orderBy: { createdAt: "desc" },
            include: { ePayments: true },
          }),
        );
      expect(Number(fullInvoice.totalAmount)).toBe(26);
      expect(Number(fullInvoice.cashTendered)).toBe(0);
      expect(Number(fullInvoice.totalTendered)).toBe(26);
      expect(fullInvoice.ePayments).toHaveLength(1);
      expect(Number(fullInvoice.ePayments[0].amount)).toBe(26);
      expect(fullInvoice.ePayments[0].reference).toBe(fullReference);

      await page.getByRole("button", { name: /New Checkout/i }).click();
      await checkoutProduct(seeded.productNames[2]);
      await page.locator("#split-cash-dialog").fill("30");
      await expect(completeSale).toBeEnabled();
      const invoiceCountBeforeRepeatedSubmit = await prisma.invoice.count({
        where: { posTerminalId: seeded.terminalId },
      });
      await completeSale.evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
      await expect(page.getByText("Transaction Done")).toBeVisible({
        timeout: 30_000,
      });

      const cashInvoice = await expect
        .poll(
          () =>
            prisma.invoice.findFirst({
              where: {
                posTerminalId: seeded!.terminalId,
                id: { notIn: [splitInvoice.id, fullInvoice.id] },
              },
              orderBy: { createdAt: "desc" },
            }),
          { timeout: 45_000 },
        )
        .not.toBeNull()
        .then(() =>
          prisma.invoice.findFirstOrThrow({
            where: {
              posTerminalId: seeded!.terminalId,
              id: { notIn: [splitInvoice.id, fullInvoice.id] },
            },
            orderBy: { createdAt: "desc" },
          }),
        );
      expect(Number(cashInvoice.totalAmount)).toBe(27);
      expect(Number(cashInvoice.cashTendered)).toBe(30);
      expect(Number(cashInvoice.totalTendered)).toBe(30);
      expect(Number(cashInvoice.changeAmount)).toBe(3);
      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(invoiceCountBeforeRepeatedSubmit + 1);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: seeded.productIds[2] },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(19);
      expect(
        await prisma.ePayment.count({ where: { invoiceId: cashInvoice.id } }),
      ).toBe(0);

      const invoiceCountBeforePreview = await prisma.invoice.count({
        where: { posTerminalId: seeded.terminalId },
      });
      await page.getByRole("button", { name: "Receipt Options" }).click();
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      const preview = page.getByRole("dialog", { name: "Receipt Preview" });
      await expect(preview).toContainText("E2E POS RESPONSIVE");
      await expect(preview).toContainText(/Total:\s+27\.00/);
      await expect(preview).toContainText(/Cash:\s+30\.00/);
      await expect(preview).toContainText(/Change:\s+3\.00/i);
      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(invoiceCountBeforePreview);
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

  test("applies only the best currently eligible promotion at checkout @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const promotions = await Promise.all([
        prisma.promotion.create({
          data: {
            companyId: seeded.companyId,
            name: `E2E BEST FIXED ${suffix}`,
            promotionType: "fixed_amount",
            value: 3,
            isActive: true,
            startsAt: new Date(now - 60_000),
            endsAt: new Date(now + 60 * 60_000),
          },
        }),
        prisma.promotion.create({
          data: {
            companyId: seeded.companyId,
            name: `E2E LOWER PERCENT ${suffix}`,
            promotionType: "percentage",
            value: 10,
            isActive: true,
          },
        }),
        prisma.promotion.create({
          data: {
            companyId: seeded.companyId,
            name: `E2E FUTURE ${suffix}`,
            promotionType: "percentage",
            value: 90,
            isActive: true,
            startsAt: new Date(now + 60 * 60_000),
          },
        }),
        prisma.promotion.create({
          data: {
            companyId: seeded.companyId,
            name: `E2E EXPIRED ${suffix}`,
            promotionType: "fixed_amount",
            value: 24,
            isActive: true,
            endsAt: new Date(now - 60_000),
          },
        }),
      ]);

      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);
      const search = page.getByPlaceholder(
        "Search name, barcode, generic, brand...",
      );
      await search.fill(seeded.productNames[0]);
      await page.getByText(seeded.productNames[0], { exact: true }).first().click();
      await page.getByRole("button", { name: "Checkout", exact: true }).click();
      await page.getByRole("button", { name: "Exact" }).click();
      const syncFinished = page.waitForResponse(
        (response) =>
          response.url().includes("/api/sync/actions") &&
          response.request().method() === "POST",
        { timeout: 45_000 },
      );
      await page.getByRole("button", { name: "Complete Sale" }).click();
      await expect(page.getByText("Transaction Done")).toBeVisible({
        timeout: 30_000,
      });
      const syncResponse = await syncFinished;
      expect(syncResponse.ok()).toBe(true);
      const syncPayload = (await syncResponse.json()) as {
        data?: { results?: Array<{ syncStatus: string; error: string | null }> };
      };
      expect(syncPayload.data?.results?.[0]).toMatchObject({
        syncStatus: "synced",
        error: null,
      });

      const invoice = await expect
        .poll(
          () =>
            prisma.invoice.findFirst({
              where: { posTerminalId: seeded!.terminalId },
              orderBy: { createdAt: "desc" },
              include: { promotionRedemptions: true },
            }),
          { timeout: 45_000 },
        )
        .not.toBeNull()
        .then(() =>
          prisma.invoice.findFirstOrThrow({
            where: { posTerminalId: seeded!.terminalId },
            orderBy: { createdAt: "desc" },
            include: { promotionRedemptions: true },
          }),
        );

      expect(Number(invoice.grossAmount)).toBe(25);
      expect(Number(invoice.discountAmount)).toBe(3);
      expect(Number(invoice.totalAmount)).toBe(22);
      expect(Number(invoice.totalTendered)).toBe(25);
      expect(Number(invoice.changeAmount)).toBe(3);
      expect(invoice.promotionRedemptions).toHaveLength(1);
      expect(invoice.promotionRedemptions[0].promotionId).toBe(promotions[0].id);
      expect(Number(invoice.promotionRedemptions[0].discountAmount)).toBe(3);
      expect(
        await prisma.promotionRedemptionLog.count({
          where: { promotionId: { in: promotions.slice(1).map(({ id }) => id) } },
        }),
      ).toBe(0);
      expect(
        await prisma.auditLog.count({
          where: {
            referenceId: invoice.id,
            actionType: "PROMOTION_APPLIED",
          },
        }),
      ).toBe(1);
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

  test("queues a provisional offline sale and syncs it exactly once after reconnect @offline @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);
      const productId = seeded.productIds[0];
      const productName = seeded.productNames[0];
      const search = page.getByPlaceholder(
        "Search name, barcode, generic, brand...",
      );
      await search.fill(productName);
      await page.getByText(productName, { exact: true }).first().click();
      await expect(page.getByTestId("pos-cart-items")).toContainText(productName);

      const serverQuantityBefore = Number(
        (
          await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: { quantity: true },
          })
        ).quantity,
      );
      await page.context().setOffline(true);
      await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
      await page.getByRole("button", { name: "Checkout", exact: true }).click();
      await page.getByRole("button", { name: "Exact" }).click();
      await page.getByRole("button", { name: "Complete Sale" }).click();
      await expect(page.getByText("Transaction Done")).toBeVisible();
      await expect(page.getByText("Queued Offline Receipt")).toBeVisible();
      await expect(page.getByText("Offline Pending Sync")).toBeVisible();
      await expect(page.getByText("pending", { exact: true })).toBeVisible();
      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(0);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: productId },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(serverQuantityBefore);

      const syncFinished = page.waitForResponse(
        (response) =>
          response.url().includes("/api/sync/actions") &&
          response.request().method() === "POST",
        { timeout: 45_000 },
      );
      await page.context().setOffline(false);
      const syncResponse = await syncFinished;
      expect(syncResponse.ok()).toBe(true);
      const syncPayload = (await syncResponse.json()) as {
        data: { results: Array<{ syncStatus: string; error: string | null }> };
      };
      expect(syncPayload.data.results).toHaveLength(1);
      expect(syncPayload.data.results[0]).toMatchObject({
        syncStatus: "synced",
        error: null,
      });
      await expect
        .poll(
          () =>
            prisma.invoice.count({
              where: { posTerminalId: seeded!.terminalId },
            }),
          { timeout: 45_000 },
        )
        .toBe(1);
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: productId },
              select: { quantity: true },
            })
          ).quantity,
        ),
      ).toBe(serverQuantityBefore - 1);
    } finally {
      await page.context().setOffline(false).catch(() => undefined);
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

  test("clearly blocks unsupported offline void and cash-out actions @offline @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1024, height: 768 });
      await openSeededPOS(page, seeded);

      const productName = seeded.productNames[1];
      await page
        .getByPlaceholder("Search name, barcode, generic, brand...")
        .fill(productName);
      await page.getByText(productName, { exact: true }).first().click();
      await expect(page.getByTestId("pos-cart-items")).toContainText(productName);

      await page.context().setOffline(true);
      await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);

      await page.getByRole("button", { name: "Void", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Reason" })
        .fill("E2E offline customer cancellation");
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByText("Order void requires an online manager approval."),
      ).toBeVisible();
      await expect(page.getByTestId("pos-cart-items")).toContainText(productName);
      await page.getByRole("button", { name: "Keep Order" }).click();

      await page.getByRole("button", { name: "Withdraw", exact: true }).click();
      const withdrawal = page.getByRole("dialog", { name: "Withdraw Cash" });
      await withdrawal.getByLabel("Withdrawal Amount").fill("50");
      await withdrawal
        .getByLabel("Withdrawal Reason")
        .fill("E2E offline bank pickup");
      await withdrawal.getByLabel("Manager Signature (PIN)").fill("2468");
      await withdrawal.getByRole("button", { name: "Withdraw" }).click();
      await expect(
        withdrawal.getByText("Cash withdrawal requires an online manager approval."),
      ).toBeVisible();

      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(0);
      expect(
        Number(
          (
            await prisma.timestamp.findUniqueOrThrow({
              where: { id: seeded.timestampId },
              select: { withdrawnDrawerAmount: true },
            })
          ).withdrawnDrawerAmount,
        ),
      ).toBe(0);

      const queuedActions = await page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const request = indexedDB.open("posard-offline-pos");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction("queuedActions", "readonly");
              const count = transaction.objectStore("queuedActions").count();
              count.onerror = () => reject(count.error);
              count.onsuccess = () => resolve(count.result);
            };
          }),
      );
      expect(queuedActions).toBe(0);
      await page.context().setOffline(false);
      expect(
        await prisma.invoice.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(0);
      expect(
        Number(
          (
            await prisma.timestamp.findUniqueOrThrow({
              where: { id: seeded.timestampId },
              select: { withdrawnDrawerAmount: true },
            })
          ).withdrawnDrawerAmount,
        ),
      ).toBe(0);
    } finally {
      await page.context().setOffline(false).catch(() => undefined);
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

  test("publishes customer display cart, payment, completed, and idle states @transaction", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;

    const readDisplayStatus = async (terminalId: string) => {
      const state = await prisma.customerDisplayState.findUnique({
        where: { terminalId },
        select: { payload: true },
      });
      return (state?.payload as { status?: string } | null)?.status ?? null;
    };

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      seeded = await seedActivePOSSession();
      await page.setViewportSize({ width: 1280, height: 800 });
      await openSeededPOS(page, seeded);

      const popupPromise = page.waitForEvent("popup");
      await page.getByRole("button", { name: /Display Off/ }).click();
      const customerDisplay = await popupPromise;
      await customerDisplay.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => readDisplayStatus(seeded!.terminalId), {
          timeout: 30_000,
        })
        .toBe("idle");

      const publishDisplay = async (
        status: "cart" | "payment" | "completed" | "idle",
      ) => {
        const response = await page.request.post(
          `/api/pos/customer-display/${encodeURIComponent(seeded!.terminalId)}`,
          {
            data: {
              terminalId: seeded!.terminalId,
              status,
              items:
                status !== "idle"
                  ? [
                      {
                        name: seeded!.productNames[0],
                        qty: 1,
                        unitPrice: 25,
                        lineTotal: 25,
                      },
                    ]
                  : [],
              subtotal: status !== "idle" ? 25 : 0,
              discountTotal: 0,
              taxTotal: status !== "idle" ? 2.68 : 0,
              totalDue: status !== "idle" ? 25 : 0,
              paymentMethod:
                status === "payment" || status === "completed" ? "Cash" : null,
              paymentDetails: null,
              cashReceived:
                status === "payment" || status === "completed" ? 25 : null,
              change: status === "payment" || status === "completed" ? 0 : null,
              message:
                status === "completed"
                  ? "Payment received. Please come again."
                  : status === "idle"
                    ? "Ready for next customer"
                    : null,
              updatedAt: new Date().toISOString(),
            },
          },
        );
        expect(response.status()).toBe(200);
        await expect
          .poll(() => readDisplayStatus(seeded!.terminalId), {
            timeout: 30_000,
          })
          .toBe(status);
      };

      await publishDisplay("cart");
      await expect(
        customerDisplay.getByText(seeded.productNames[0]),
      ).toBeVisible({
        timeout: 30_000,
      });
      await publishDisplay("payment");
      await publishDisplay("completed");
      await expect(customerDisplay.getByText(/Payment received/i)).toBeVisible({
        timeout: 30_000,
      });
      await publishDisplay("idle");
      await expect(
        customerDisplay.getByText(/Ready for next customer/i),
      ).toBeVisible({
        timeout: 30_000,
      });
      await customerDisplay.close();
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

  test("requires terminal selection and manager-approved opening cash @transaction", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
    let seeded: SeededPOSSession | null = null;
    let branchId: string | null = null;

    try {
      authUser = await ensureAuthUserForProfile(cashierCredentials);
      const branch = await prisma.branch.create({
        data: {
          companyId: profiles.companyId,
          name: `E2E Session Branch ${Date.now()}`,
        },
        select: { id: true },
      });
      branchId = branch.id;
      await prisma.profile.update({
        where: { email: cashierCredentials.email },
        data: { branchId: branch.id },
      });
      seeded = await seedActivePOSSession();
      await prisma.posTerminalInfo.update({
        where: { id: seeded.terminalId },
        data: { branchId: branch.id },
      });
      await prisma.timestamp.deleteMany({
        where: { posTerminalId: seeded.terminalId },
      });

      await authenticatePageWithCredentials(page, cashierCredentials);
      await page.goto("/pos");
      await expect(
        page.getByRole("heading", { name: "Select POS Terminal" }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("pos-shell")).toHaveCount(0);
      await page.getByRole("button", { name: "Initialize Session" }).click();

      const dialog = page.getByRole("dialog", { name: /Open Session:/ });
      await dialog.getByLabel("Opening Cash Amount").fill("100");
      await dialog.getByLabel("Approving Manager PIN").fill("0000");
      await dialog.getByRole("button", { name: "Open Session" }).click();
      await expect(dialog).toContainText(/Invalid manager PIN|approval/i);
      expect(
        await prisma.timestamp.count({
          where: { posTerminalId: seeded.terminalId },
        }),
      ).toBe(0);

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: "Initialize Session" }).click();
      const retryDialog = page.getByRole("dialog", { name: /Open Session:/ });
      await retryDialog.getByLabel("Opening Cash Amount").fill("100");
      await retryDialog.getByLabel("Approving Manager PIN").fill("2468");
      await expect(
        retryDialog.getByRole("button", { name: "Open Session" }),
      ).toBeEnabled();
      await retryDialog
        .getByRole("button", { name: "Open Session" })
        .evaluate((button: HTMLButtonElement) => button.click());
      await expect
        .poll(
          () =>
            prisma.timestamp.count({
              where: { posTerminalId: seeded!.terminalId, timestampOut: null },
            }),
          { timeout: 45_000 },
        )
        .toBe(1);
      await expect(page.getByTestId("pos-shell")).toBeVisible({
        timeout: 30_000,
      });
      const openedSession = await prisma.timestamp.findFirstOrThrow({
        where: { posTerminalId: seeded.terminalId, timestampOut: null },
        select: {
          cashInDrawerAmount: true,
          managerInId: true,
          cashierId: true,
        },
      });
      expect(Number(openedSession.cashInDrawerAmount)).toBe(100);
      expect(openedSession.cashierId).toBe(
        (
          await prisma.profile.findUniqueOrThrow({
            where: { email: cashierCredentials.email },
            select: { id: true },
          })
        ).id,
      );
      expect(openedSession.managerInId).toBeTruthy();
    } finally {
      if (seeded) {
        await prisma.timestamp.deleteMany({
          where: { posTerminalId: seeded.terminalId },
        });
      }
      try {
        await seeded?.cleanup();
      } finally {
        try {
          await authUser?.cleanup();
        } finally {
          await profiles.cleanup();
          if (branchId) {
            await prisma.branch.deleteMany({ where: { id: branchId } });
          }
        }
      }
    }
  });

  test("closes a cashier session once with counted cash and manager approval @transaction", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
      null;
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

      await page.getByRole("button", { name: "Withdraw", exact: true }).click();
      const withdrawDialog = page.getByRole("dialog", {
        name: "Withdraw Cash",
      });
      await withdrawDialog.getByLabel("Withdrawal Amount").fill("1200");
      await withdrawDialog.getByLabel("Manager Signature (PIN)").fill("2468");
      await expect(
        withdrawDialog.getByRole("button", { name: "Withdraw" }),
      ).toBeDisabled();
      await withdrawDialog
        .getByLabel("Withdrawal Reason")
        .fill("E2E bank deposit pickup");
      await withdrawDialog.getByRole("button", { name: "Withdraw" }).click();
      await expect(
        withdrawDialog.getByText(/Insufficient cash in drawer/i),
      ).toBeVisible();
      expect(
        await prisma.auditLog.count({
          where: { referenceId: timestamp.id, actionType: "CASH_WITHDRAWAL" },
        }),
      ).toBe(0);

      await withdrawDialog.getByLabel("Withdrawal Amount").fill("200");
      await withdrawDialog.getByRole("button", { name: "Withdraw" }).click();
      await expect(page.getByText("Cash withdrawn successfully")).toBeVisible();
      await expect(withdrawDialog).toHaveCount(0);
      const afterWithdrawal = await prisma.timestamp.findUniqueOrThrow({
        where: { id: timestamp.id },
        select: { withdrawnDrawerAmount: true, withdrawnDrawerCount: true },
      });
      expect(Number(afterWithdrawal.withdrawnDrawerAmount)).toBe(200);
      expect(Number(afterWithdrawal.withdrawnDrawerCount)).toBe(1);
      const withdrawalAudit = await prisma.auditLog.findFirst({
          where: {
            referenceId: timestamp.id,
            actionType: "CASH_WITHDRAWAL",
            amount: 200,
          },
          select: {
            companyId: true,
            actorProfileId: true,
            posTerminalId: true,
            actionType: true,
            referenceId: true,
            amount: true,
            changes: true,
            createdAt: true,
          },
        });
      expect(withdrawalAudit).not.toBeNull();
      expect(withdrawalAudit).toMatchObject({
        companyId: seeded.companyId,
        posTerminalId: seeded.terminalId,
        actionType: "CASH_WITHDRAWAL",
        referenceId: timestamp.id,
      });
      expect(withdrawalAudit?.actorProfileId).toBeTruthy();
      expect(withdrawalAudit?.createdAt).toBeInstanceOf(Date);
      expect(Number(withdrawalAudit?.amount)).toBe(200);
      expect(JSON.parse(withdrawalAudit?.changes ?? "{}")).toMatchObject({
        reason: "E2E bank deposit pickup",
      });
      expect(withdrawalAudit?.changes ?? "").not.toMatch(
        /password|managerPin|\bpin\b|token|secret|database_url|connection string/i,
      );

      const concurrentPage = await page.context().newPage();
      await openSeededPOS(concurrentPage, seeded);

      await page.getByRole("button", { name: "Close", exact: true }).click();
      const closeDialog = page.getByRole("dialog", { name: "Close Session" });
      await expect(closeDialog).toBeVisible();
      await expect(closeDialog.getByText("PHP 800.00")).toBeVisible();
      await closeDialog.getByLabel("Counted Cash Amount").fill("790");
      await expect(closeDialog.getByTestId("cash-variance")).toHaveText(
        "PHP -10.00",
      );
      await closeDialog.getByLabel("Approving Manager PIN").fill("2468");
      await concurrentPage
        .getByRole("button", { name: "Close", exact: true })
        .click();
      const concurrentDialog = concurrentPage.getByRole("dialog", {
        name: "Close Session",
      });
      await concurrentDialog.getByLabel("Counted Cash Amount").fill("790");
      await concurrentDialog.getByLabel("Approving Manager PIN").fill("2468");
      await Promise.all([
        closeDialog.getByRole("button", { name: "Close Session" }).click(),
        concurrentDialog.getByRole("button", { name: "Close Session" }).click(),
      ]);
      await expect
        .poll(
          async () => {
            const firstClosed = await page
              .getByRole("heading", { name: "Session Closed" })
              .isVisible()
              .catch(() => false);
            const secondClosed = await concurrentPage
              .getByRole("heading", { name: "Session Closed" })
              .isVisible()
              .catch(() => false);
            return firstClosed || secondClosed;
          },
          { timeout: 30_000 },
        )
        .toBe(true);

      const closed = await prisma.timestamp.findUniqueOrThrow({
        where: { id: timestamp.id },
        include: { posTerminal: true },
      });
      expect(closed.timestampOut).toBeTruthy();
      expect(Number(closed.cashOutDrawerAmount)).toBe(790);
      expect(closed.managerOutId).toBeTruthy();
      expect(closed.posTerminal.isActive).toBe(false);
      const closeAudits = await prisma.auditLog.findMany({
        where: {
          referenceId: timestamp.id,
          actionType: "CLOSE_SESSION",
        },
        select: { changes: true },
      });
      expect(closeAudits).toHaveLength(1);
      expect(JSON.parse(closeAudits[0].changes ?? "{}")).toMatchObject({
        expectedCash: 800,
        countedCash: 790,
        variance: -10,
      });

      await concurrentPage.close();

      const doneButton = page.getByRole("button", { name: "Done" });
      if (await doneButton.isVisible().catch(() => false))
        await doneButton.click();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Close", exact: true }),
      ).toHaveCount(0);
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

  test("keeps cashier tablet app mode out of heavy report routes", async ({
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
          value: "tablet-browser",
          url: baseUrl,
        },
      ]);

      await page.goto("/reports/sales");

      await expect(page).toHaveURL(/\/pos(?:\?.*)?$/);
      await expect(
        page.getByRole("heading", { name: "Point of Sale" }),
      ).toBeVisible();
      await expect(page.getByText(cashierCredentials.email)).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Sales Reports" }),
      ).toHaveCount(0);
    } finally {
      await authUser?.cleanup();
      await profiles.cleanup();
    }
  });
});
