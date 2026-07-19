import { expect, test, type Page } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

async function ticketRow(page: Page, ticketNumber: string) {
  await page.reload();
  return page.getByRole('row').filter({ hasText: ticketNumber });
}

test('starts, readies, serves, and cancels kitchen tickets @transaction', async ({ page }) => {
  test.setTimeout(240_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let terminalId: string | null = null;
  let invoiceId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const manager = await prisma.profile.findUniqueOrThrow({
      where: { email: managerCredentials.email }, select: { id: true },
    });
    const terminal = await prisma.posTerminalInfo.create({
      data: {
        companyId: profiles.companyId,
        minNumber: `MIN-KIT-${suffix}`,
        accreditationNumber: `ACC-KIT-${suffix}`,
        ptuNumber: `PTU-KIT-${suffix}`,
        dateIssued: new Date('2024-01-01'),
        validUntil: new Date('2035-01-01'),
        posName: `E2E Kitchen Terminal ${suffix}`,
        registeredName: 'E2E Kitchen',
        operatedBy: 'E2E Kitchen',
        address: 'E2E Test Address',
        vatTinNumber: `TIN-KIT-${suffix}`,
        vat: 12,
        isActive: true,
        enableKitchenTickets: true,
      },
      select: { id: true },
    });
    terminalId = terminal.id;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 1,
        idempotencyKey: `E2E-KITCHEN-${suffix}`,
        grossAmount: 100,
        totalAmount: 100,
        subTotal: 100,
        totalTendered: 100,
        status: 'PAID',
        fulfillmentType: 'DINE_IN',
        tableNumber: 'K-1',
        posTerminalId: terminalId,
        cashierId: manager.id,
      },
      select: { id: true },
    });
    invoiceId = invoice.id;
    const [servedTicket, cancelledTicket] = await Promise.all([
      prisma.kitchenTicket.create({
        data: {
          ticketNumber: `KT-E2E-SERVE-${suffix}`,
          companyId: profiles.companyId,
          terminalId,
          invoiceId,
          station: 'Hot Kitchen',
          notes: 'E2E serve lifecycle',
        },
      }),
      prisma.kitchenTicket.create({
        data: {
          ticketNumber: `KT-E2E-CANCEL-${suffix}`,
          companyId: profiles.companyId,
          terminalId,
          invoiceId,
          station: 'Cold Kitchen',
          notes: 'E2E cancel lifecycle',
        },
      }),
    ]);

    await authenticatePageWithCredentials(page, managerCredentials);
    await page.goto('/kitchen');
    await expect(page).toHaveURL(/\/kitchen$/);

    let row = await ticketRow(page, servedTicket.ticketNumber);
    await row.locator('input[name="notes"]').fill('Started preparation');
    await row.getByRole('button', { name: 'Start' }).click();
    await expect.poll(async () => (await prisma.kitchenTicket.findUniqueOrThrow({ where: { id: servedTicket.id } })).status).toBe('preparing');
    row = await ticketRow(page, servedTicket.ticketNumber);
    await row.locator('input[name="notes"]').fill('Ready for handoff');
    await row.getByRole('button', { name: 'Ready' }).click();
    await expect.poll(async () => (await prisma.kitchenTicket.findUniqueOrThrow({ where: { id: servedTicket.id } })).status).toBe('ready');
    row = await ticketRow(page, servedTicket.ticketNumber);
    await row.locator('input[name="notes"]').fill('Served to table');
    await row.getByRole('button', { name: 'Served' }).click();
    await expect.poll(async () => (await prisma.kitchenTicket.findUniqueOrThrow({ where: { id: servedTicket.id } })).status).toBe('served');
    const served = await prisma.kitchenTicket.findUniqueOrThrow({ where: { id: servedTicket.id } });
    expect(served.readyAt).not.toBeNull();
    expect(served.servedAt).not.toBeNull();
    expect(served.updatedById).toBe(manager.id);

    row = await ticketRow(page, cancelledTicket.ticketNumber);
    await row.locator('input[name="notes"]').fill('Customer cancelled');
    await row.getByRole('button', { name: 'Cancel' }).click();
    await expect.poll(async () => (await prisma.kitchenTicket.findUniqueOrThrow({ where: { id: cancelledTicket.id } })).status).toBe('cancelled');
    expect(await prisma.auditLog.count({
      where: { companyId: profiles.companyId, actionType: { startsWith: 'kitchen_ticket_' } },
    })).toBe(4);
  } finally {
    await prisma.auditLog.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.kitchenTicket.deleteMany({ where: { companyId: profiles.companyId } });
    if (invoiceId) await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    if (terminalId) await prisma.posTerminalInfo.deleteMany({ where: { id: terminalId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
