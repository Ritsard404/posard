import 'dotenv/config';

import { prisma } from '../../lib/prisma';
import { managerCredentials } from './auth.fixture';
import { assertE2EDatabaseWritesAllowed } from './e2e-environment';

export type SeededProduct = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  barcode: string;
};

export function makeProductTestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeProductName(testId: string, suffix = 'Product') {
  return `E2E ${suffix} ${testId}`;
}

export function makeCategoryName(testId: string, suffix = 'Category') {
  return `E2E ${suffix} ${testId}`.toUpperCase();
}

async function getManagerCompanyId() {
  const managerProfile = await prisma.profile.findUnique({
    where: { email: managerCredentials.email },
    select: { companyId: true },
  });

  if (!managerProfile?.companyId) {
    throw new Error(
      `Manager test account ${managerCredentials.email} must have an active companyId to test product management.`,
    );
  }

  return managerProfile.companyId;
}

export async function seedManagerProduct(params?: {
  name?: string;
  categoryName?: string;
  barcode?: string;
  quantity?: number;
  trackInventory?: boolean;
}) {
  assertE2EDatabaseWritesAllowed();
  const testId = makeProductTestId();
  const companyId = await getManagerCompanyId();
  const categoryName =
    params?.categoryName ?? makeCategoryName(testId, 'Seed Category');

  const category = await prisma.category.create({
    data: {
      categoryName,
      companyId,
    },
    select: { id: true, categoryName: true },
  });

  const name = params?.name ?? makeProductName(testId, 'Seed Product');
  const barcode = params?.barcode ?? `E2E-${testId}`;
  const trackInventory = params?.trackInventory ?? true;

  const product = await prisma.product.create({
    data: {
      name,
      barcode,
      baseUnit: 'UNIT',
      quantity: trackInventory ? params?.quantity ?? 8 : null,
      cost: 10,
      price: 15,
      isAvailable: true,
      trackInventory,
      itemType: 'RESALE',
      vatType: 'VATABLE',
      categoryId: category.id,
      companyId,
    },
    select: { id: true },
  });

  return {
    id: product.id,
    name,
    categoryId: category.id,
    categoryName: category.categoryName ?? categoryName,
    barcode,
  } satisfies SeededProduct;
}

export async function findProductByName(name: string) {
  return prisma.product.findFirst({
    where: { name },
    select: {
      id: true,
      categoryId: true,
      quantity: true,
      price: true,
      isAvailable: true,
      isDeleted: true,
    },
  });
}

export async function findCategoryByName(categoryName: string) {
  return prisma.category.findFirst({
    where: { categoryName },
    select: { id: true, categoryName: true, isDeleted: true },
  });
}

export async function cleanupProductTestData(params: {
  productIds?: string[];
  categoryIds?: string[];
  productNames?: string[];
  categoryNames?: string[];
}) {
  const productIds = new Set(params.productIds ?? []);
  const categoryIds = new Set(params.categoryIds ?? []);

  if (params.productNames?.length) {
    const products = await prisma.product.findMany({
      where: { name: { in: params.productNames } },
      select: { id: true, categoryId: true },
    });

    for (const product of products) {
      productIds.add(product.id);
      categoryIds.add(product.categoryId);
    }
  }

  if (params.categoryNames?.length) {
    const categories = await prisma.category.findMany({
      where: { categoryName: { in: params.categoryNames } },
      select: { id: true },
    });

    for (const category of categories) {
      categoryIds.add(category.id);
    }
  }

  const ids = Array.from(productIds);
  if (ids.length > 0) {
    await prisma.inventory.deleteMany({ where: { productId: { in: ids } } });
    await prisma.productImage.deleteMany({ where: { productId: { in: ids } } });
    await prisma.auditLog.deleteMany({
      where: { referenceId: { in: ids } },
    });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
  }

  const categories = Array.from(categoryIds);
  if (categories.length > 0) {
    await prisma.category.deleteMany({ where: { id: { in: categories } } });
  }
}
