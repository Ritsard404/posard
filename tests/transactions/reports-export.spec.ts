import { expect, test } from "@playwright/test";

import { prisma } from "../../lib/prisma";
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from "../fixtures/auth.fixture";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

test("reconciles a sale report and exports CSV and spreadsheet data @transaction", async ({
  page,
}) => {
  test.setTimeout(240_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
    null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let terminalId: string | null = null;
  let branchId: string | null = null;
  let saleTypeId: string | null = null;
  let invoiceId: string | null = null;
  const correctionInvoiceIds: string[] = [];
  const boundaryInvoiceIds: string[] = [];
  const paginationInvoicePrefix = `E2E-REPORT-PAGE-${suffix}`;
  let invoiceDocumentId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const manager = await prisma.profile.findUniqueOrThrow({
      where: { email: managerCredentials.email },
      select: { id: true },
    });
    const branch = await prisma.branch.create({
      data: {
        companyId: profiles.companyId,
        name: `E2E Report Branch ${suffix}`,
        code: `RPT-${suffix}`.slice(0, 30),
        timezone: "Asia/Manila",
      },
      select: { id: true },
    });
    branchId = branch.id;
    const terminal = await prisma.posTerminalInfo.create({
      data: {
        companyId: profiles.companyId,
        minNumber: `MIN-RPT-${suffix}`,
        accreditationNumber: `ACC-RPT-${suffix}`,
        ptuNumber: `PTU-RPT-${suffix}`,
        dateIssued: new Date("2024-01-01"),
        validUntil: new Date("2035-01-01"),
        posName: `E2E Report Terminal ${suffix}`,
        registeredName: "E2E Reports",
        operatedBy: "E2E Reports",
        address: "E2E Test Address",
        vatTinNumber: `TIN-RPT-${suffix}`,
        vat: 12,
        isActive: true,
        branchId,
      },
      select: { id: true },
    });
    terminalId = terminal.id;
    const saleType = await prisma.saleType.create({
      data: {
        companyId: profiles.companyId,
        name: `E2E Report Card ${suffix}`,
        type: "EPAYMENT",
      },
      select: { id: true },
    });
    saleTypeId = saleType.id;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 9876,
        idempotencyKey: `E2E-REPORT-${suffix}`,
        grossAmount: 140,
        totalAmount: 125,
        subTotal: 125,
        totalTendered: 125,
        cashTendered: 75,
        vatSales: 0,
        vatExempt: 125,
        vatAmount: 0,
        discountType: "SENIOR",
        discountPercent: 20,
        discountAmount: 15,
        eligibleDiscName: `E2E Senior ${suffix}`,
        oscaIdNum: `OSCA-${suffix}`,
        status: "PAID",
        customerName: `E2E Report Customer ${suffix}`,
        posTerminalId: terminalId!,
        branchId: branchId!,
        cashierId: manager.id,
      },
      select: { id: true },
    });
    invoiceId = invoice.id;
    const correctionInvoices = await Promise.all([
      prisma.invoice.create({
        data: {
          invoiceNumber: 9877,
          idempotencyKey: `E2E-REPORT-VOID-${suffix}`,
          grossAmount: 20,
          totalAmount: 20,
          subTotal: 20,
          totalTendered: 20,
          cashTendered: 20,
          status: "VOID",
          customerName: `E2E Void ${suffix}`,
          posTerminalId: terminalId,
          branchId,
          cashierId: manager.id,
        },
        select: { id: true },
      }),
      prisma.invoice.create({
        data: {
          invoiceNumber: 9878,
          idempotencyKey: `E2E-REPORT-RETURN-${suffix}`,
          grossAmount: 30,
          totalAmount: 30,
          subTotal: 30,
          totalTendered: 30,
          cashTendered: 30,
          returnedAmount: 10,
          status: "RETURNED",
          customerName: `E2E Return ${suffix}`,
          posTerminalId: terminalId,
          branchId,
          cashierId: manager.id,
        },
        select: { id: true },
      }),
    ]);
    correctionInvoiceIds.push(...correctionInvoices.map((item) => item.id));
    const boundaryInvoices = await Promise.all([
      prisma.invoice.create({
        data: {
          invoiceNumber: 9880,
          idempotencyKey: `E2E-REPORT-BOUNDARY-IN-${suffix}`,
          grossAmount: 11,
          totalAmount: 11,
          subTotal: 11,
          totalTendered: 11,
          cashTendered: 11,
          status: "PAID",
          customerName: `E2E Boundary Included ${suffix}`,
          posTerminalId: terminalId!,
          branchId: branchId!,
          cashierId: manager.id,
          createdAt: new Date("2026-07-01T15:59:59.999Z"),
        },
        select: { id: true },
      }),
      prisma.invoice.create({
        data: {
          invoiceNumber: 9881,
          idempotencyKey: `E2E-REPORT-BOUNDARY-OUT-${suffix}`,
          grossAmount: 12,
          totalAmount: 12,
          subTotal: 12,
          totalTendered: 12,
          cashTendered: 12,
          status: "PAID",
          customerName: `E2E Boundary Excluded ${suffix}`,
          posTerminalId: terminalId!,
          branchId: branchId!,
          cashierId: manager.id,
          createdAt: new Date("2026-07-02T16:00:00.000Z"),
        },
        select: { id: true },
      }),
    ]);
    boundaryInvoiceIds.push(...boundaryInvoices.map((item) => item.id));
    await prisma.invoice.createMany({
      data: Array.from({ length: 26 }, (_, index) => ({
        invoiceNumber: 9900 + index,
        idempotencyKey: `${paginationInvoicePrefix}-${index}`,
        grossAmount: 5,
        totalAmount: 5,
        subTotal: 5,
        totalTendered: 5,
        cashTendered: 5,
        status: "VOID" as const,
        customerName: `E2E Page Void ${index} ${suffix}`,
        posTerminalId: terminalId!,
        branchId: branchId!,
        cashierId: manager.id,
      })),
    });
    await prisma.ePayment.create({
      data: {
        invoiceId: invoice.id,
        saleTypeId,
        reference: `E2E-RPT-PAY-${suffix}`,
        amount: 50,
      },
    });
    const invoiceDocument = await prisma.invoiceDocument.create({
      data: {
        invoiceId: invoice.id,
        type: "INVOICE",
        invoiceBlob: Buffer.from(
          "E2E RECEIPT\nInvoice #000000009876\nTotal: PHP 125.00",
          "utf8",
        ),
      },
      select: { id: true },
    });
    invoiceDocumentId = invoiceDocument.id;

    await authenticatePageWithCredentials(page, managerCredentials);
    const query = `companyId=${profiles.companyId}&terminalId=${terminalId}&preset=today`;
    const paidQuery = `${query}&status=PAID`;
    await page.goto(`/reports/sales?${paidQuery}`);
    await expect(
      page.getByRole("heading", { name: "Sales" }).last(),
    ).toBeVisible();
    await expect(
      page.getByText("#000000009876", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(`E2E Report Customer ${suffix}`)).toBeVisible();

    const scopedPaidQuery = `${query}&branchId=${branchId}&cashierId=${manager.id}&status=PAID`;
    await page.goto(`/reports/sales?${scopedPaidQuery}`);
    await expect(page.getByText("#000000009876", { exact: true })).toBeVisible();
    await expect(page.getByText("#000000009877", { exact: true })).toHaveCount(0);

    const scopedVoidQuery = `${query}&branchId=${branchId}&cashierId=${manager.id}&status=VOID`;
    await page.goto(`/reports/sales?${scopedVoidQuery}`);
    await expect(page.getByText("#000000009876", { exact: true })).toHaveCount(0);

    const scopedReturnedQuery = `${query}&branchId=${branchId}&cashierId=${manager.id}&status=RETURNED`;
    await page.goto(`/reports/sales?${scopedReturnedQuery}`);
    await expect(page.getByText("#000000009878", { exact: true })).toBeVisible();
    await expect(page.getByText("#000000009876", { exact: true })).toHaveCount(0);

    const hostileScopeQuery = `${query}&branchId=00000000-0000-0000-0000-000000000000&cashierId=00000000-0000-0000-0000-000000000000&status=PAID`;
    await page.goto(`/reports/sales?${hostileScopeQuery}`);
    await expect(page.getByText("#000000009876", { exact: true })).toHaveCount(0);

    await page.goto(`/reports/sales?${scopedVoidQuery}&page=2`);
    await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
    await expect(page.getByText("#000000009877", { exact: true })).toBeVisible();
    await expect(page.getByText(/E2E Page Void/).first()).toBeVisible();

    await page.goto(`/reports/daily-transactions?${query}`);
    await expect(
      page.getByText(`E2E Report Terminal ${suffix}`, { exact: true }).first(),
    ).toBeVisible();

    const boundaryQuery = `companyId=${profiles.companyId}&terminalId=${terminalId}&preset=custom&period=daily&from=2026-07-01&to=2026-07-01`;
    await page.goto(`/reports/sales?${boundaryQuery}`);
    await expect(page.getByText(`E2E Boundary Included ${suffix}`)).toBeVisible();
    await expect(page.getByText(`E2E Boundary Excluded ${suffix}`)).toHaveCount(0);

    const seniorQuery = `companyId=${profiles.companyId}&terminalId=${terminalId}&preset=custom&period=annual&from=2020-01-01&to=2030-01-01`;
    await page.goto(`/reports/senior-discounts?${seniorQuery}`);
    await expect(page.getByText(`E2E Senior ${suffix}`)).toBeVisible();
    await expect(page.getByText(`OSCA-${suffix}`)).toBeVisible();

    await page.goto(`/reports?${query}`);
    await expect(page.getByText(`E2E Report Card ${suffix}`)).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Terminal Performance")).toBeVisible();
    const terminalPerformance = page
      .getByText(`E2E Report Terminal ${suffix}`, { exact: true })
      .first()
      .locator("..")
      .locator("..");
    await expect(terminalPerformance).toContainText("₱110.00");
    await expect(page.getByText("Voids Today", { exact: true }).locator("..")).toContainText("₱150.00");
    await expect(page.getByText("Returns Today", { exact: true }).locator("..")).toContainText("₱10.00");

    await page.goto(`/reports/sales?${paidQuery}`);
    await expect(page.getByText("₱125.00").first()).toBeVisible();

    const emptyBoundaryQuery = `companyId=${profiles.companyId}&terminalId=${terminalId}&preset=custom&period=daily&from=2020-01-01&to=2020-01-01`;
    await page.goto(`/reports/sales?${emptyBoundaryQuery}`);
    await expect(page.getByText("No transactions were found for this date range and terminal scope.")).toBeVisible();

    const inclusiveBoundaryQuery = `companyId=${profiles.companyId}&terminalId=${terminalId}&preset=custom&period=daily&from=2020-01-01&to=2030-01-01&status=PAID`;
    await page.goto(`/reports/sales?${inclusiveBoundaryQuery}`);
    await expect(page.getByText("#000000009876", { exact: true })).toBeVisible();

    const invoiceCountBeforeReprint = await prisma.invoice.count({
      where: { posTerminalId: terminalId },
    });
    await page
      .getByRole("button", { name: /Reprint \/ Preview #000000009876/ })
      .click();
    const preview = page.getByRole("dialog", { name: "Invoice #000000009876" });
    await expect(preview).toContainText("E2E RECEIPT", { timeout: 30_000 });
    await expect(preview).toContainText(/REPRINT COPY|Reprint/i);
    expect(
      await prisma.invoice.count({ where: { posTerminalId: terminalId } }),
    ).toBe(invoiceCountBeforeReprint);
    expect(
      (
        await prisma.invoiceDocument.findUniqueOrThrow({
          where: { id: invoiceDocument.id },
          select: { reprintCount: true },
        })
      ).reprintCount,
    ).toBe(1);

    const csvResponse = await page.request.get(
      `/reports/export?type=sales&${paidQuery}&format=csv`,
    );
    expect(csvResponse.status()).toBe(200);
    expect(csvResponse.headers()["content-type"]).toContain("text/csv");
    expect(csvResponse.headers()["content-disposition"]).toContain(".csv");
    const csv = await csvResponse.text();
    expect(csv).toContain("Transaction No.,Date,Cashier,Terminal,Customer");
    expect(csv).toContain("9876");
    expect(csv).toContain(`E2E Report Customer ${suffix}`);

    const xlsResponse = await page.request.get(
      `/reports/export?type=sales&${paidQuery}&format=xls`,
    );
    expect(xlsResponse.status()).toBe(200);
    expect(xlsResponse.headers()["content-disposition"]).toContain(".xls");
    const workbook = await xlsResponse.text();
    expect(workbook).toContain("<Workbook");
    expect(workbook).toContain("9876");
    expect(
      await prisma.auditLog.count({
        where: {
          companyId: profiles.companyId,
          actionType: "SECURITY_REPORT_EXPORT",
        },
      }),
    ).toBe(2);
  } finally {
    await prisma.auditLog.deleteMany({
      where: { companyId: profiles.companyId },
    });
    if (invoiceDocumentId)
      await prisma.invoiceDocument.deleteMany({
        where: { id: invoiceDocumentId },
      });
    if (invoiceId)
      await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    if (correctionInvoiceIds.length > 0)
      await prisma.invoice.deleteMany({ where: { id: { in: correctionInvoiceIds } } });
    if (boundaryInvoiceIds.length > 0)
      await prisma.invoice.deleteMany({ where: { id: { in: boundaryInvoiceIds } } });
    await prisma.invoice.deleteMany({
      where: { idempotencyKey: { startsWith: paginationInvoicePrefix } },
    });
    if (saleTypeId)
      await prisma.saleType.deleteMany({ where: { id: saleTypeId } });
    if (terminalId)
      await prisma.posTerminalInfo.deleteMany({ where: { id: terminalId } });
    if (branchId)
      await prisma.branch.deleteMany({ where: { id: branchId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
