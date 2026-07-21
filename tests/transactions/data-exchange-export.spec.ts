import { expect, test } from "@playwright/test";

import { prisma } from "../../lib/prisma";
import {
  authenticatePageWithCredentials,
  cashierCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from "../fixtures/auth.fixture";
import { assertE2EDatabaseWritesAllowed } from "../fixtures/e2e-environment";

test("scopes backup and catalog exports and enforces manager permissions @permissions @transaction", async ({
  page,
}) => {
  test.setTimeout(240_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let managerAuth: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
    null;
  let cashierAuth: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null =
    null;
  let ownCategoryId: string | null = null;
  let ownProductId: string | null = null;
  let foreignCompanyId: string | null = null;

  const ownProductName = `E2E Export Own Product ${suffix}`;
  const foreignProductName = `E2E Export Foreign Product ${suffix}`;

  try {
    managerAuth = await ensureAuthUserForProfile(managerCredentials);
    cashierAuth = await ensureAuthUserForProfile(cashierCredentials);

    const ownCategory = await prisma.category.create({
      data: {
        companyId: profiles.companyId,
        categoryName: `E2E Export Own Category ${suffix}`,
      },
      select: { id: true },
    });
    ownCategoryId = ownCategory.id;
    const ownProduct = await prisma.product.create({
      data: {
        companyId: profiles.companyId,
        categoryId: ownCategoryId,
        name: ownProductName,
        barcode: `EXP-OWN-${suffix}`,
        baseUnit: "PCS",
        quantity: 3,
        cost: 10,
        price: 20,
        trackInventory: true,
      },
      select: { id: true },
    });
    ownProductId = ownProduct.id;

    const foreignCompany = await prisma.company.create({
      data: { name: `E2E Export Foreign Company ${suffix}` },
      select: { id: true },
    });
    foreignCompanyId = foreignCompany.id;
    const foreignCategory = await prisma.category.create({
      data: {
        companyId: foreignCompanyId,
        categoryName: `E2E Export Foreign Category ${suffix}`,
      },
      select: { id: true },
    });
    await prisma.product.create({
      data: {
        companyId: foreignCompanyId,
        categoryId: foreignCategory.id,
        name: foreignProductName,
        barcode: `EXP-FOREIGN-${suffix}`,
        baseUnit: "PCS",
        quantity: 99,
        cost: 50,
        price: 100,
        trackInventory: true,
      },
    });

    await authenticatePageWithCredentials(page, managerCredentials);

    const fullBackup = await page.request.get(
      "/data-exchange/backup/export?scope=full",
    );
    expect(fullBackup.status()).toBe(403);
    expect(await fullBackup.text()).toContain(
      "Full administrative backup requires admin access",
    );

    const backup = await page.request.get("/data-exchange/backup/export");
    expect(backup.status()).toBe(200);
    expect(backup.headers()["content-type"]).toContain("application/json");
    expect(backup.headers()["content-disposition"]).toContain("posard-backup-");
    expect(backup.headers()["cache-control"]).toContain("no-store");
    const backupBody = await backup.text();
    expect(backupBody).toContain(ownProductName);
    expect(backupBody).not.toContain(foreignProductName);
    expect(JSON.parse(backupBody).users).toEqual([]);

    const spreadsheet = await page.request.get(
      "/data-exchange/product-catalog/export?format=xls",
    );
    expect(spreadsheet.status()).toBe(200);
    expect(spreadsheet.headers()["content-disposition"]).toContain(".xls");
    const spreadsheetBody = await spreadsheet.text();
    expect(spreadsheetBody).toContain("<Workbook");
    expect(spreadsheetBody).toContain(ownProductName);
    expect(spreadsheetBody).not.toContain(foreignProductName);

    const pdf = await page.request.get(
      "/data-exchange/product-catalog/export?format=pdf",
    );
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect(pdf.headers()["content-disposition"]).toContain(".pdf");
    const pdfBody = await pdf.text();
    expect(pdfBody).toContain(ownProductName);
    expect(pdfBody).not.toContain(foreignProductName);

    expect(
      await prisma.auditLog.count({
        where: {
          companyId: profiles.companyId,
          actionType: {
            in: [
              "SECURITY_DATA_BACKUP_EXPORT",
              "SECURITY_PRODUCT_CATALOG_EXPORT",
            ],
          },
        },
      }),
    ).toBe(3);

    await authenticatePageWithCredentials(page, cashierCredentials);
    for (const route of [
      "/data-exchange/backup/export",
      "/data-exchange/product-catalog/export?format=xls",
    ]) {
      const denied = await page.request.get(route);
      expect(denied.status(), route).toBe(403);
      expect(await denied.text()).toContain("Manager access is required");
    }
  } finally {
    await prisma.auditLog.deleteMany({
      where: { companyId: profiles.companyId },
    });
    if (ownProductId)
      await prisma.product.deleteMany({ where: { id: ownProductId } });
    if (ownCategoryId)
      await prisma.category.deleteMany({ where: { id: ownCategoryId } });
    await prisma.product.deleteMany({
      where: { name: { startsWith: "E2E Export Foreign Product " } },
    });
    await prisma.category.deleteMany({
      where: { categoryName: { startsWith: "E2E Export Foreign Category " } },
    });
    if (foreignCompanyId)
      await prisma.company.deleteMany({ where: { id: foreignCompanyId } });
    if (cashierAuth) await cashierAuth.cleanup();
    if (managerAuth) await managerAuth.cleanup();
    await profiles.cleanup();
  }
});
