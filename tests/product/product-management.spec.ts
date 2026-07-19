import { expect, test, type Page } from '@playwright/test';

import { loginAsManager } from '../fixtures/auth.fixture';
import {
  cleanupProductTestData,
  findCategoryByName,
  findProductByName,
  makeCategoryName,
  makeProductName,
  makeProductTestId,
  seedManagerProduct,
  type SeededProduct,
} from '../fixtures/product.fixture';
import { prisma } from '../../lib/prisma';

const productSearch =
  'Search name, barcode, generic, brand, category, supplier...';

async function openProductManagement(page: Page) {
  await loginAsManager(page);
  await page.goto('/product');

  await expect(page).toHaveURL(/\/product(?:\?.*)?$/);
  await expect(page.getByPlaceholder(productSearch)).toBeVisible();
}

async function searchProduct(page: Page, productName: string) {
  await page.getByPlaceholder(productSearch).fill(productName);
  await expect(
    page.getByRole('table').getByText(productName, { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

function productRow(page: Page, productName: string) {
  return page.locator('tr').filter({ hasText: productName }).first();
}

async function openProductActions(page: Page, productName: string) {
  const row = productRow(page, productName);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Actions' }).click();
}

test.describe('manager product management @transaction', () => {
  test('renders the inventory product management surface for a manager', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openProductManagement(page);

    await expect(page.getByText('Total Products')).toBeVisible();
    await expect(page.getByText('Categories', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Low Stock', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Product' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import CSV' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Categories', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /All Categories/ }),
    ).toBeVisible();
  });

  test('filters products by name and barcode', async ({ page }) => {
    const seeded = await seedManagerProduct();

    try {
      await openProductManagement(page);

      await searchProduct(page, seeded.name);

      const row = productRow(page, seeded.name);
      await expect(row).toContainText(seeded.categoryName);
      await expect(row).toContainText(seeded.barcode);

      await page.getByPlaceholder(productSearch).fill(`${seeded.barcode}-miss`);

      await expect(page.getByText('No matching products')).toBeVisible();
    } finally {
      await cleanupProductTestData({
        productIds: [seeded.id],
        categoryIds: [seeded.categoryId],
      });
    }
  });

  test('creates, reads, updates, and soft deletes a tracked product', async ({
    page,
  }) => {
    const testId = makeProductTestId();
    const productName = makeProductName(testId, 'Created Product');
    const updatedProductName = makeProductName(testId, 'Updated Product');
    const categoryName = makeCategoryName(testId, 'Created Category');

    try {
      await openProductManagement(page);

      await page.getByRole('button', { name: 'New Product' }).click();

      const dialog = page.getByRole('dialog', { name: 'New Product' });
      await expect(dialog).toBeVisible();

      await dialog.getByLabel('Product Name').fill(productName);
      await dialog.getByLabel('New Category Name').fill(categoryName);
      await dialog.getByLabel('Barcode').fill(`E2E-CREATED-${testId}`);
      await dialog.getByLabel('Price').fill('42.50');
      await dialog.getByLabel('Cost').fill('21.25');
      await dialog.getByLabel('Base Unit').fill('UNIT');
      await dialog.getByRole('checkbox', { name: 'Track inventory' }).click();
      await expect(
        dialog.getByRole('checkbox', { name: 'Track inventory' }),
      ).toBeChecked();
      await dialog.getByLabel('Quantity').fill('12');

      await dialog.getByRole('button', { name: 'Create Product' }).click();

      await expect(dialog).toBeHidden({ timeout: 20_000 });
      await expect
        .poll(async () => (await findProductByName(productName))?.isDeleted)
        .toBe(false);

      await searchProduct(page, productName);

      const row = productRow(page, productName);
      await expect(row).toContainText(categoryName);
      await expect(row).toContainText('42.50');
      await expect(row).toContainText('12 UNIT');
      await expect(row).toContainText('Active');

      await openProductActions(page, productName);
      await page.getByRole('menuitem', { name: 'Edit Product' }).click();

      const editDialog = page.getByRole('dialog', { name: 'Edit Product' });
      await expect(editDialog).toBeVisible();
      await expect(editDialog.getByLabel('Product Name')).toHaveValue(
        productName,
      );

      await editDialog.getByLabel('Product Name').fill(updatedProductName);
      await editDialog.getByLabel('Price').fill('45.75');
      await editDialog
        .getByRole('checkbox', { name: 'Available for sale' })
        .click();
      await expect(
        editDialog.getByRole('checkbox', { name: 'Available for sale' }),
      ).not.toBeChecked();
      await editDialog.getByRole('button', { name: 'Save Changes' }).click();

      await expect(editDialog).toBeHidden({ timeout: 20_000 });
      await expect
        .poll(async () => {
          const product = await findProductByName(updatedProductName);

          return {
            price: Number(product?.price ?? 0),
            isAvailable: product?.isAvailable,
            isDeleted: product?.isDeleted,
          };
        })
        .toEqual({
          price: 45.75,
          isAvailable: false,
          isDeleted: false,
        });

      await searchProduct(page, updatedProductName);

      const updatedRow = productRow(page, updatedProductName);
      await expect(updatedRow).toContainText('45.75');
      await expect(updatedRow).toContainText('Disabled');

      await openProductActions(page, updatedProductName);
      await page.getByRole('menuitem', { name: 'Delete Product' }).click();

      const deleteDialog = page.getByRole('alertdialog', {
        name: 'Delete Product',
      });
      await expect(deleteDialog).toBeVisible();
      await expect(deleteDialog).toContainText(updatedProductName);

      await deleteDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(deleteDialog).toBeHidden({ timeout: 15_000 });
      await expect
        .poll(async () => (await findProductByName(updatedProductName))?.isDeleted)
        .toBe(true);

      await page.getByPlaceholder(productSearch).fill(updatedProductName);
      await expect(page.getByText('No matching products')).toBeVisible();
    } finally {
      await cleanupProductTestData({
        productNames: [productName, updatedProductName],
        categoryNames: [categoryName],
      });
    }
  });

  test('adjusts stock for a tracked product', async ({ page }) => {
    const seeded = await seedManagerProduct({ quantity: 3 });

    try {
      await openProductManagement(page);
      await searchProduct(page, seeded.name);
      await openProductActions(page, seeded.name);
      await page.getByRole('menuitem', { name: 'Adjust Stock' }).click();

      const dialog = page.getByRole('alertdialog', { name: 'Adjust Stock' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(seeded.name);
      await expect(dialog).toContainText('Current stock: 3');

      await dialog.getByLabel(/Quantity/).fill('4');
      await dialog.getByLabel('Reference (optional)').fill('E2E stock in');
      await dialog.getByRole('button', { name: 'Confirm' }).click();

      await expect(dialog).toBeHidden({ timeout: 15_000 });
      await expect
        .poll(async () => {
          const product = await prisma.product.findUnique({
            where: { id: seeded.id },
            select: { quantity: true },
          });

          return Number(product?.quantity ?? 0);
        })
        .toBe(7);

      await searchProduct(page, seeded.name);
      await expect(productRow(page, seeded.name)).toContainText('7 UNIT');
    } finally {
      await cleanupProductTestData({
        productIds: [seeded.id],
        categoryIds: [seeded.categoryId],
      });
    }
  });

  test('soft deletes a product from the row actions', async ({ page }) => {
    const seeded: SeededProduct = await seedManagerProduct();

    try {
      await openProductManagement(page);
      await searchProduct(page, seeded.name);
      await openProductActions(page, seeded.name);
      await page.getByRole('menuitem', { name: 'Delete Product' }).click();

      const dialog = page.getByRole('alertdialog', { name: 'Delete Product' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(seeded.name);

      await dialog.getByRole('button', { name: 'Delete' }).click();

      await expect(dialog).toBeHidden({ timeout: 15_000 });
      await expect
        .poll(async () => (await findProductByName(seeded.name))?.isDeleted)
        .toBe(true);

      await page.getByPlaceholder(productSearch).fill(seeded.name);
      await expect(page.getByText('No matching products')).toBeVisible();
    } finally {
      await cleanupProductTestData({
        productIds: [seeded.id],
        categoryIds: [seeded.categoryId],
      });
    }
  });

  test('creates, renames, and soft deletes a product category', async ({
    page,
  }) => {
    const testId = makeProductTestId();
    const categoryName = makeCategoryName(testId, 'Category Crud');
    const renamedCategory = 'E2e category renamed ' + testId;
    const savedRenamedCategory = 'E2e category renamed ' + testId.toLowerCase();

    try {
      await openProductManagement(page);
      await page.getByRole('button', { name: 'Categories', exact: true }).click();

      const sheet = page.getByRole('dialog', { name: 'Manage Categories' });
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(
        'Create, rename, or remove product categories.',
      );

      await sheet.getByPlaceholder('New category name').fill(categoryName);
      await sheet.getByRole('button', { name: 'Create category' }).click();

      await expect(sheet.getByText(categoryName, { exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await expect
        .poll(async () => (await findCategoryByName(categoryName))?.isDeleted)
        .toBe(false);

      await sheet
        .getByRole('button', { name: `Edit ${categoryName}` })
        .click();
      await sheet.getByLabel('Category name').fill(renamedCategory);
      await sheet
        .getByRole('button', { name: `Save ${renamedCategory}` })
        .click();

      await expect(
        sheet.getByText(savedRenamedCategory, { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      await expect
        .poll(async () => {
          const category = await findCategoryByName(savedRenamedCategory);

          return category?.isDeleted;
        })
        .toBe(false);

      await sheet
        .getByRole('button', { name: `Delete ${savedRenamedCategory}` })
        .click();

      const deleteDialog = page.getByRole('alertdialog', {
        name: 'Delete Category',
      });
      await expect(deleteDialog).toBeVisible();
      await expect(deleteDialog).toContainText(savedRenamedCategory);

      await deleteDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(deleteDialog).toBeHidden({ timeout: 15_000 });
      await expect
        .poll(async () => {
          const category = await findCategoryByName(savedRenamedCategory);

          return category?.isDeleted;
        })
        .toBe(true);
    } finally {
      await cleanupProductTestData({
        categoryNames: [categoryName, savedRenamedCategory],
      });
    }
  });
});
