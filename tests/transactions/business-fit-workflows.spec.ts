import { expect, test } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

function formFor(page: import('@playwright/test').Page, fieldName: string) {
  return page.locator(`[name="${fieldName}"]`).first().locator('xpath=ancestor::form');
}

test('creates every enabled business-fit workflow with scoped references @transaction', async ({ page }) => {
  test.setTimeout(360_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let categoryId: string | null = null;
  let productId: string | null = null;
  let customerId: string | null = null;
  let terminalId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const category = await prisma.category.create({
      data: { companyId: profiles.companyId, categoryName: `E2E BUSINESS FIT ${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;
    const [product, customer, terminal] = await Promise.all([
      prisma.product.create({
        data: {
          companyId: profiles.companyId,
          categoryId,
          name: `E2E Service Product ${suffix}`,
          barcode: `BIZ-${suffix}`,
          baseUnit: 'SERVICE',
          quantity: 0,
          cost: 0,
          price: 500,
          trackInventory: false,
          trackingMode: 'SERVICE',
          isAvailable: true,
          itemType: 'RESALE',
          vatType: 'VATABLE',
        },
        select: { id: true },
      }),
      prisma.customer.create({
        data: { companyId: profiles.companyId, name: `E2E Business Customer ${suffix}`, accountType: 'WHOLESALE' },
        select: { id: true },
      }),
      prisma.posTerminalInfo.create({
        data: {
          companyId: profiles.companyId,
          minNumber: `MIN-BIZ-${suffix}`,
          accreditationNumber: `ACC-BIZ-${suffix}`,
          ptuNumber: `PTU-BIZ-${suffix}`,
          dateIssued: new Date('2024-01-01'),
          validUntil: new Date('2035-01-01'),
          posName: `E2E Business Terminal ${suffix}`,
          registeredName: 'E2E Business Fit',
          operatedBy: 'E2E Business Fit',
          address: 'E2E Test Address',
          vatTinNumber: `TIN-BIZ-${suffix}`,
          vat: 12,
          isActive: true,
        },
        select: { id: true },
      }),
    ]);
    productId = product.id;
    customerId = customer.id;
    terminalId = terminal.id;

    await authenticatePageWithCredentials(page, managerCredentials);
    await page.goto('/business-fit');
    await expect(page).toHaveURL(/\/business-fit$/);

    let form = formFor(page, 'scheduledStart');
    await form.locator('select[name="customerId"]').selectOption(customerId);
    await form.locator('select[name="serviceProductId"]').selectOption(productId);
    await form.locator('select[name="terminalId"]').selectOption(terminalId);
    await form.locator('input[name="scheduledStart"]').fill('2030-02-01T10:00');
    await form.locator('input[name="scheduledEnd"]').fill('2030-02-01T11:00');
    await form.locator('input[name="depositAmount"]').fill('100');
    await form.locator('input[name="notes"]').fill('E2E service booking');
    await form.getByRole('button', { name: 'Create' }).click();
    await expect.poll(async () => prisma.serviceBooking.count({ where: { companyId: profiles.companyId } })).toBe(1);

    await page.reload();
    form = formFor(page, 'itemLabel');
    await form.locator('select[name="customerId"]').selectOption(customerId);
    await form.locator('select[name="laborProductId"]').selectOption(productId);
    await form.locator('select[name="terminalId"]').selectOption(terminalId);
    await form.locator('input[name="itemLabel"]').fill('E2E phone repair');
    await form.locator('input[name="serialReference"]').fill(`IMEI-${suffix}`);
    await form.locator('input[name="issueSummary"]').fill('Broken charging port');
    await form.locator('input[name="estimateAmount"]').fill('800');
    await form.locator('input[name="depositAmount"]').fill('200');
    await form.getByRole('button', { name: 'Create' }).click();
    await expect.poll(async () => prisma.repairJob.count({ where: { companyId: profiles.companyId } })).toBe(1);

    await page.reload();
    form = formFor(page, 'paymentTermsDays');
    await form.locator('select[name="customerId"]').selectOption(customerId);
    await form.locator('select[name="terminalId"]').selectOption(terminalId);
    await form.locator('select[name="productId"]').selectOption(productId);
    await form.locator('input[name="quantity"]').fill('3');
    await form.locator('input[name="unitPrice"]').fill('500');
    await form.locator('input[name="discountAmount"]').fill('100');
    await form.locator('input[name="paymentTermsDays"]').fill('30');
    await form.locator('input[name="notes"]').fill('E2E wholesale order');
    await form.getByRole('button', { name: 'Create' }).click();
    const order = await expect.poll(async () => prisma.salesOrder.findFirst({
      where: { companyId: profiles.companyId }, include: { items: true },
    })).not.toBeNull().then(() => prisma.salesOrder.findFirstOrThrow({
      where: { companyId: profiles.companyId }, include: { items: true },
    }));
    expect(Number(order.subtotalAmount)).toBe(1500);
    expect(Number(order.totalAmount)).toBe(1400);
    expect(order.items).toHaveLength(1);

    await page.reload();
    form = formFor(page, 'fulfillmentType');
    await form.locator('select[name="terminalId"]').selectOption(terminalId);
    await form.locator('select[name="customerId"]').selectOption(customerId);
    await form.locator('select[name="fulfillmentType"]').selectOption('DINE_IN');
    await form.locator('input[name="ticketName"]').fill('E2E table order');
    await form.locator('input[name="tableNumber"]').fill('T-8');
    await form.locator('input[name="guestCount"]').fill('4');
    await form.getByRole('button', { name: 'Create' }).click();
    await expect.poll(async () => prisma.posOpenTicket.count({ where: { companyId: profiles.companyId } })).toBe(1);

    await page.reload();
    form = formFor(page, 'prescriptionReference');
    await form.locator('select[name="productId"]').selectOption(productId);
    await form.locator('select[name="customerId"]').selectOption(customerId);
    await form.locator('select[name="terminalId"]').selectOption(terminalId);
    await form.locator('select[name="status"]').selectOption('VERIFIED');
    await form.locator('input[name="prescriptionReference"]').fill(`RX-${suffix}`);
    await form.getByRole('button', { name: 'Create' }).click();
    const verification = await expect.poll(async () => prisma.prescriptionVerification.findFirst({
      where: { companyId: profiles.companyId },
    })).not.toBeNull().then(() => prisma.prescriptionVerification.findFirstOrThrow({
      where: { companyId: profiles.companyId },
    }));
    expect(verification.status).toBe('VERIFIED');
    expect(verification.verifiedById).not.toBeNull();

    await page.reload();
    await expect(page.getByText('E2E service booking')).toBeVisible();
    await expect(page.getByText('E2E phone repair')).toBeVisible();
    await expect(page.getByText('30 day terms')).toBeVisible();
    await expect(page.getByText('E2E table order')).toBeVisible();
  } finally {
    await prisma.prescriptionVerification.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.posOpenTicket.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.salesOrder.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.repairJob.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.serviceBooking.deleteMany({ where: { companyId: profiles.companyId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    if (terminalId) await prisma.posTerminalInfo.deleteMany({ where: { id: terminalId } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
