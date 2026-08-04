import { expect, test, type Page } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

type FinanceFixture = {
  companyId: string;
  terminalId: string;
  terminalName: string;
  expenseCategoryId: string;
  expenseCategoryName: string;
  cleanup: () => Promise<void>;
};

async function seedFinanceFixture(companyId: string): Promise<FinanceFixture> {
  assertE2EDatabaseWritesAllowed();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const terminalName = `E2E Finance Terminal ${suffix}`;
  const expenseCategoryName = `E2E Utilities ${suffix}`;
  const [terminal, category] = await Promise.all([
    prisma.posTerminalInfo.create({
      data: {
        minNumber: `MIN-FIN-${suffix}`,
        accreditationNumber: `ACC-FIN-${suffix}`,
        ptuNumber: `PTU-FIN-${suffix}`,
        dateIssued: new Date('2024-01-01'),
        validUntil: new Date('2035-01-01'),
        posName: terminalName,
        registeredName: 'E2E Finance',
        operatedBy: 'E2E Finance',
        address: 'E2E Test Address',
        vatTinNumber: `TIN-FIN-${suffix}`,
        vat: 12,
        isActive: true,
        companyId,
      },
      select: { id: true },
    }),
    prisma.expenseCategory.create({
      data: { companyId, name: expenseCategoryName },
      select: { id: true },
    }),
  ]);

  return {
    companyId,
    terminalId: terminal.id,
    terminalName,
    expenseCategoryId: category.id,
    expenseCategoryName,
    async cleanup() {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.userNotification.deleteMany({ where: { companyId } });
      await prisma.expense.deleteMany({ where: { companyId } });
      await prisma.nonSalesIncome.deleteMany({ where: { companyId } });
      await prisma.promotion.deleteMany({ where: { companyId } });
      await prisma.supplier.deleteMany({ where: { companyId } });
      await prisma.posTerminalInfo.deleteMany({ where: { id: terminal.id } });
      await prisma.expenseCategory.deleteMany({ where: { id: category.id } });
    },
  };
}

async function openAsManager(page: Page, path: string) {
  await authenticatePageWithCredentials(page, managerCredentials);
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path}(?:\\?.*)?$`));
}

async function createExpense(
  page: Page,
  fixture: FinanceFixture,
  amount: number,
  notes: string,
) {
  const form = page.locator('form').filter({
    has: page.getByRole('button', { name: 'Record Expense' }),
  });
  await form.locator('select[name="categoryId"]').selectOption(fixture.expenseCategoryId);
  await form.locator('select[name="terminalId"]').selectOption(fixture.terminalId);
  await form.locator('input[name="amount"]').fill(String(amount));
  await form.locator('input[name="notes"]').fill(notes);
  const recordExpense = form.getByRole('button', { name: 'Record Expense' });
  await recordExpense.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  return expect.poll(async () => prisma.expense.findFirst({
    where: { companyId: fixture.companyId, notes },
    orderBy: { createdAt: 'desc' },
  })).not.toBeNull().then(() => prisma.expense.findFirstOrThrow({
    where: { companyId: fixture.companyId, notes },
    orderBy: { createdAt: 'desc' },
  }));
}

test.describe('finance and management workflows @transaction', () => {
  test('approves/posts, rejects, and cancels expenses and records non-sales income', async ({ page }) => {
    test.setTimeout(240_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
    let seeded: FinanceFixture | null = null;

    try {
      authUser = await ensureAuthUserForProfile(managerCredentials);
      seeded = await seedFinanceFixture(profiles.companyId);
      await openAsManager(page, '/expenses');

      const expenseCountBeforeInvalid = await prisma.expense.count({
        where: { companyId: seeded.companyId },
      });
      const invalidForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Record Expense' }),
      });
      await invalidForm.locator('select[name="categoryId"]').selectOption(seeded.expenseCategoryId);
      await invalidForm.locator('input[name="amount"]').fill('-1');
      await invalidForm.getByRole('button', { name: 'Record Expense' }).click();
      await expect(invalidForm.locator('input[name="amount"]')).toHaveJSProperty(
        'validity.rangeUnderflow',
        true,
      );
      expect(await prisma.expense.count({ where: { companyId: seeded.companyId } }))
        .toBe(expenseCountBeforeInvalid);

      const postedExpense = await createExpense(page, seeded, 1200, 'E2E approve and post');
      expect(postedExpense.status).toBe('pending_approval');
      await page.reload();
      let row = page.getByRole('row').filter({ hasText: postedExpense.referenceNumber });
      await row.getByRole('button', { name: 'Approve' }).click();
      await expect.poll(async () =>
        (await prisma.expense.findUniqueOrThrow({ where: { id: postedExpense.id } })).status,
      ).toBe('approved');
      await page.reload();
      row = page.getByRole('row').filter({ hasText: postedExpense.referenceNumber });
      await row.getByRole('button', { name: 'Post' }).click();
      await expect.poll(async () =>
        (await prisma.expense.findUniqueOrThrow({ where: { id: postedExpense.id } })).status,
      ).toBe('posted');

      await page.reload();
      const rejectedExpense = await createExpense(page, seeded, 1500, 'E2E reject expense');
      await page.reload();
      row = page.getByRole('row').filter({ hasText: rejectedExpense.referenceNumber });
      await row.getByRole('button', { name: 'Reject' }).click();
      await expect.poll(async () =>
        (await prisma.expense.findUniqueOrThrow({ where: { id: rejectedExpense.id } })).status,
      ).toBe('rejected');

      await page.reload();
      const cancelledExpense = await createExpense(page, seeded, 500, 'E2E cancel expense');
      expect(cancelledExpense.status).toBe('approved');
      await page.reload();
      row = page.getByRole('row').filter({ hasText: cancelledExpense.referenceNumber });
      await row.getByRole('button', { name: 'Cancel' }).click();
      await expect.poll(async () =>
        (await prisma.expense.findUniqueOrThrow({ where: { id: cancelledExpense.id } })).status,
      ).toBe('cancelled');

      await page.reload();
      const incomeForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Record Income' }),
      });
      await incomeForm.locator('input[name="source"]').fill('E2E supplier rebate');
      await incomeForm.locator('select[name="terminalId"]').selectOption(seeded.terminalId);
      await incomeForm.locator('input[name="amount"]').fill('300');
      await incomeForm.locator('input[name="externalReference"]').fill('REBATE-E2E-1');
      await incomeForm.locator('input[name="notes"]').fill('E2E non-sales reconciliation');
      const recordIncome = incomeForm.getByRole('button', { name: 'Record Income' });
      await recordIncome.evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
      const income = await expect.poll(async () => prisma.nonSalesIncome.findFirst({
        where: { companyId: seeded!.companyId, externalReference: 'REBATE-E2E-1' },
      })).not.toBeNull().then(() => prisma.nonSalesIncome.findFirstOrThrow({
        where: { companyId: seeded!.companyId, externalReference: 'REBATE-E2E-1' },
      }));
      expect(Number(income.amount)).toBe(300);
      expect(income.terminalId).toBe(seeded.terminalId);

      expect(await prisma.auditLog.count({
        where: {
          referenceId: { in: [postedExpense.id, rejectedExpense.id, cancelledExpense.id] },
          actionType: { startsWith: 'expense_' },
        },
      })).toBe(7);
      expect(await prisma.auditLog.count({
        where: { referenceId: income.id, actionType: 'non_sales_income_created' },
      })).toBe(1);

      await page.goto(`/expenses?search=${encodeURIComponent('E2E approve and post')}&status=posted`);
      await expect(page.getByRole('cell', { name: postedExpense.referenceNumber })).toBeVisible();
      await expect(page.getByRole('cell', { name: rejectedExpense.referenceNumber })).toHaveCount(0);
      await page.goto('/expenses?status=rejected');
      await expect(page.getByRole('cell', { name: rejectedExpense.referenceNumber })).toBeVisible();
      await expect(page.getByRole('cell', { name: postedExpense.referenceNumber })).toHaveCount(0);

      await page.goto('/reports');
      const pendingExpenseCard = page
        .getByText('Pending Expenses', { exact: true })
        .locator('..');
      await expect(pendingExpenseCard).toContainText('0');
      await page.goto('/dashboard');
      await expect(page.getByText('Posted Expenses', { exact: true }).locator('..'))
        .toContainText(/1,200\.00/);
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

  test('creates debt customers with non-negative credit validation and audit state', async ({ page }) => {
    test.setTimeout(180_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
    const customerName = `E2E Debt Customer ${Date.now()}`;
    let customerId: string | null = null;

    try {
      authUser = await ensureAuthUserForProfile(managerCredentials);
      await openAsManager(page, '/debts');
      const addCustomer = page.getByPlaceholder('Quick add customer');
      const creditLimit = page.getByPlaceholder('Credit limit');
      const customerCountBefore = await prisma.customer.count({
        where: { companyId: profiles.companyId },
      });

      await addCustomer.fill(customerName);
      await creditLimit.fill('-1');
      await page.getByRole('button', { name: 'Add Customer' }).click();
      await expect(creditLimit).toHaveJSProperty('validity.rangeUnderflow', true);
      expect(await prisma.customer.count({ where: { companyId: profiles.companyId } }))
        .toBe(customerCountBefore);

      await creditLimit.fill('5000');
      await page.getByPlaceholder('Terms days').fill('30');
      await page.getByRole('button', { name: 'Add Customer' }).click();
      const customer = await expect.poll(async () => prisma.customer.findFirst({
        where: { companyId: profiles.companyId, name: customerName },
      })).not.toBeNull().then(() => prisma.customer.findFirstOrThrow({
        where: { companyId: profiles.companyId, name: customerName },
      }));
      customerId = customer.id;
      expect(Number(customer.creditLimit)).toBe(5000);
      expect(customer.paymentTermsDays).toBe(30);
      expect(await prisma.auditLog.count({
        where: { referenceId: customer.id, actionType: 'DEBT_CUSTOMER_CREATED' },
      })).toBe(1);
    } finally {
      if (customerId) {
        await prisma.auditLog.deleteMany({ where: { referenceId: customerId } });
        await prisma.customer.delete({ where: { id: customerId } });
      }
      if (authUser) await authUser.cleanup();
      await profiles.cleanup();
    }
  });

  test('creates and archives a supplier and exercises the promotion lifecycle', async ({ page }) => {
    test.setTimeout(180_000);
    const profiles = await ensurePosResponsiveProfiles();
    let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
    let seeded: FinanceFixture | null = null;

    try {
      authUser = await ensureAuthUserForProfile(managerCredentials);
      seeded = await seedFinanceFixture(profiles.companyId);
      const suffix = `${Date.now()}`;
      const supplierName = `E2E Managed Supplier ${suffix}`;
      await openAsManager(page, '/suppliers');
      const supplierForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Save Supplier' }),
      });
      await supplierForm.locator('input[name="name"]').fill(supplierName);
      await supplierForm.locator('input[name="contactName"]').fill('E2E Contact');
      await supplierForm.locator('input[name="phone"]').fill('+639000000000');
      await supplierForm.locator('input[name="email"]').fill(`supplier-${suffix}@example.com`);
      await supplierForm.locator('input[name="notes"]').fill('E2E supplier terms');
      await supplierForm.getByRole('button', { name: 'Save Supplier' }).click();
      const supplier = await expect.poll(async () => prisma.supplier.findFirst({
        where: { companyId: seeded!.companyId, name: supplierName },
      })).not.toBeNull().then(() => prisma.supplier.findFirstOrThrow({
        where: { companyId: seeded!.companyId, name: supplierName },
      }));
      expect(supplier.status).toBe('active');
      await page.reload();
      await page.getByRole('row').filter({ hasText: supplierName })
        .getByRole('button', { name: 'Archive' }).click();
      await expect.poll(async () =>
        (await prisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } })).status,
      ).toBe('inactive');

      const promotionName = `E2E Promotion ${suffix}`;
      await page.goto('/promotions');
      const promotionForm = page.locator('form').filter({
        has: page.getByRole('button', { name: 'Create Promo' }),
      });
      await promotionForm.locator('input[name="name"]').fill(promotionName);
      await promotionForm.locator('select[name="promotionType"]').selectOption('percentage');
      await promotionForm.locator('input[name="value"]').fill('10');
      await promotionForm.locator('input[name="notes"]').fill('E2E promotion lifecycle');
      await promotionForm.getByRole('button', { name: 'Create Promo' }).click();
      const promotion = await expect.poll(async () => prisma.promotion.findFirst({
        where: { companyId: seeded!.companyId, name: promotionName },
      })).not.toBeNull().then(() => prisma.promotion.findFirstOrThrow({
        where: { companyId: seeded!.companyId, name: promotionName },
      }));
      expect(promotion.isActive).toBe(false);

      for (const [button, active] of [
        ['Activate', true],
        ['Pause', false],
      ] as const) {
        await page.reload();
        const promotionRow = page.getByRole('row').filter({ hasText: promotionName });
        await promotionRow.getByRole('button', { name: button }).click();
        await expect.poll(async () =>
          (await prisma.promotion.findUniqueOrThrow({ where: { id: promotion.id } })).isActive,
        ).toBe(active);
      }

      await page.reload();
      let promotionRow = page.getByRole('row').filter({ hasText: promotionName, hasNotText: 'Copy' });
      await promotionRow.getByRole('button', { name: 'Duplicate' }).click();
      await expect.poll(() => prisma.promotion.count({
        where: { companyId: seeded!.companyId, name: { startsWith: promotionName } },
      })).toBe(2);
      await page.reload();
      promotionRow = page.getByRole('row').filter({ hasText: promotionName, hasNotText: 'Copy' });
      await promotionRow.getByRole('button', { name: 'Archive' }).click();
      await expect.poll(async () => {
        const current = await prisma.promotion.findUniqueOrThrow({ where: { id: promotion.id } });
        return JSON.stringify({ active: current.isActive, metadata: current.ruleJson });
      }).toContain('archived');
      expect((await prisma.promotion.findUniqueOrThrow({ where: { id: promotion.id } })).isActive).toBe(false);
      expect(await prisma.auditLog.count({
        where: { companyId: seeded.companyId, actionType: { startsWith: 'promotion_' } },
      })).toBe(5);
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
});
