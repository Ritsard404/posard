import { expect, test } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

test('reconciles a sale report and exports CSV and spreadsheet data @transaction', async ({ page }) => {
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
        minNumber: `MIN-RPT-${suffix}`,
        accreditationNumber: `ACC-RPT-${suffix}`,
        ptuNumber: `PTU-RPT-${suffix}`,
        dateIssued: new Date('2024-01-01'),
        validUntil: new Date('2035-01-01'),
        posName: `E2E Report Terminal ${suffix}`,
        registeredName: 'E2E Reports',
        operatedBy: 'E2E Reports',
        address: 'E2E Test Address',
        vatTinNumber: `TIN-RPT-${suffix}`,
        vat: 12,
        isActive: true,
      },
      select: { id: true },
    });
    terminalId = terminal.id;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 9876,
        idempotencyKey: `E2E-REPORT-${suffix}`,
        grossAmount: 125,
        totalAmount: 125,
        subTotal: 111.61,
        totalTendered: 125,
        cashTendered: 125,
        vatSales: 111.61,
        vatAmount: 13.39,
        status: 'PAID',
        customerName: `E2E Report Customer ${suffix}`,
        posTerminalId: terminalId,
        cashierId: manager.id,
      },
      select: { id: true },
    });
    invoiceId = invoice.id;

    await authenticatePageWithCredentials(page, managerCredentials);
    const query = `companyId=${profiles.companyId}&terminalId=${terminalId}&preset=today`;
    await page.goto(`/reports/sales?${query}`);
    await expect(page.getByRole('heading', { name: 'Sales' }).last()).toBeVisible();
    await expect(page.getByText('#000000009876', { exact: true })).toBeVisible();
    await expect(page.getByText(`E2E Report Customer ${suffix}`)).toBeVisible();
    await expect(page.getByText('₱125.00').first()).toBeVisible();

    const csvResponse = await page.request.get(`/reports/export?type=sales&${query}&format=csv`);
    expect(csvResponse.status()).toBe(200);
    expect(csvResponse.headers()['content-type']).toContain('text/csv');
    expect(csvResponse.headers()['content-disposition']).toContain('.csv');
    const csv = await csvResponse.text();
    expect(csv).toContain('Transaction No.,Date,Cashier,Terminal,Customer');
    expect(csv).toContain('9876');
    expect(csv).toContain(`E2E Report Customer ${suffix}`);

    const xlsResponse = await page.request.get(`/reports/export?type=sales&${query}&format=xls`);
    expect(xlsResponse.status()).toBe(200);
    expect(xlsResponse.headers()['content-disposition']).toContain('.xls');
    const workbook = await xlsResponse.text();
    expect(workbook).toContain('<Workbook');
    expect(workbook).toContain('9876');
    expect(await prisma.auditLog.count({
      where: { companyId: profiles.companyId, actionType: 'SECURITY_REPORT_EXPORT' },
    })).toBe(2);
  } finally {
    await prisma.auditLog.deleteMany({ where: { companyId: profiles.companyId } });
    if (invoiceId) await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    if (terminalId) await prisma.posTerminalInfo.deleteMany({ where: { id: terminalId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
