import { expect, test } from "@playwright/test";

import { prisma } from "../../lib/prisma";

async function readWithRetry<T>(read: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      if ((error as { code?: string }).code !== "ECONNREFUSED") throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 1_000 * (attempt + 1)),
      );
    }
  }
  throw lastError;
}

test("temporary destructive fixtures leave no E2E transaction data", async () => {
  const companies = await readWithRetry(() =>
    prisma.company.count({
      where: { name: { startsWith: "E2E" } },
    }),
  );
  const products = await prisma.product.findMany({
    where: { name: { startsWith: "E2E" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const categories = await prisma.category.findMany({
    where: { categoryName: { startsWith: "E2E" } },
    select: { id: true, categoryName: true },
    orderBy: { categoryName: "asc" },
  });
  const customers = await prisma.customer.count({
    where: { name: { startsWith: "E2E" } },
  });
  const suppliers = await prisma.supplier.count({
    where: { name: { startsWith: "E2E" } },
  });
  const invoices = await prisma.invoice.count({
    where: {
      OR: [
        { customerName: { startsWith: "E2E" } },
        { idempotencyKey: { startsWith: "E2E-" } },
        { idempotencyKey: { startsWith: "offline-" } },
      ],
    },
  });
  const syncIssues = await prisma.offlineSyncIssue.count({
    where: { localId: { startsWith: "offline-" } },
  });
  const kitchenTickets = await prisma.kitchenTicket.count({
    where: { ticketNumber: { startsWith: "KT-E2E" } },
  });

  expect({
    companies,
    products: products.map(({ name }) => name),
    categories: categories.map(({ categoryName }) => categoryName),
    customers,
    suppliers,
    invoices,
    syncIssues,
    kitchenTickets,
  }).toEqual({
    companies: 0,
    products: [],
    categories: [],
    customers: 0,
    suppliers: 0,
    invoices: 0,
    syncIssues: 0,
    kitchenTickets: 0,
  });
});
