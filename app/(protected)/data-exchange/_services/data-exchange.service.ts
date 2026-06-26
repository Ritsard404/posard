import "server-only";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

async function requireCompanyManager() {
  const profile = await getCurrentProfile();

  if (!profile?.companyId) {
    throw new Error("Company context is required.");
  }

  if (profile.role === "cashier") {
    throw new Error("Manager access is required.");
  }

  return { companyId: profile.companyId, profileId: profile.id };
}

function textPdf(title: string, lines: string[]) {
  const escapedLines = [title, "", ...lines]
    .map((line) => line.replace(/[\\()]/g, "\\$&"))
    .slice(0, 48);
  const content = `BT /F1 10 Tf 40 780 Td ${escapedLines
    .map((line, index) => `${index === 0 ? "" : "0 -14 Td "}(${line}) Tj`)
    .join(" ")} ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];
  let offset = "%PDF-1.4\n".length;
  const xref = objects.map((object) => {
    const current = offset;
    offset += object.length + 1;
    return current;
  });
  const body = objects.join("\n");
  const xrefStart = "%PDF-1.4\n".length + body.length + 1;
  return `%PDF-1.4\n${body}\nxref\n0 6\n0000000000 65535 f \n${xref
    .map((value) => `${String(value).padStart(10, "0")} 00000 n `)
    .join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
}

export const dataExchangeService = {
  async buildBackup() {
    const { companyId } = await requireCompanyManager();
    const [
      company,
      categories,
      suppliers,
      products,
      customers,
      invoices,
      stockMovements,
      stockLots,
      profiles,
      terminals,
      expenses,
      nonSalesIncomes,
    ] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.category.findMany({ where: { companyId } }),
      prisma.supplier.findMany({ where: { companyId } }),
      prisma.product.findMany({ where: { companyId, isDeleted: false } }),
      prisma.customer.findMany({ where: { companyId } }),
      prisma.invoice.findMany({
        where: { posTerminal: { companyId } },
        include: { items: true, ePayments: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
      prisma.stockLot.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
      prisma.profile.findMany({
        where: { companyId },
        select: { id: true, email: true, fullName: true, role: true, status: true },
      }),
      prisma.posTerminalInfo.findMany({ where: { companyId } }),
      prisma.expense.findMany({ where: { companyId } }),
      prisma.nonSalesIncome.findMany({ where: { companyId } }),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      company,
      categories,
      suppliers,
      products,
      customers,
      invoices,
      stockMovements,
      stockLots,
      users: profiles,
      settings: { terminals },
      expenses,
      nonSalesIncomes,
    };
  },

  async previewRestore(payload: string) {
    const { companyId } = await requireCompanyManager();
    const parsed = JSON.parse(payload) as {
      products?: Array<{ name?: string; barcode?: string | null }>;
      categories?: Array<{ categoryName?: string }>;
      customers?: Array<{ name?: string; phone?: string | null }>;
    };

    const [existingProducts, existingCategories, existingCustomers] = await Promise.all([
      prisma.product.findMany({
        where: { companyId, isDeleted: false },
        select: { name: true, barcode: true },
      }),
      prisma.category.findMany({ where: { companyId }, select: { categoryName: true } }),
      prisma.customer.findMany({ where: { companyId }, select: { name: true, phone: true } }),
    ]);

    const productKeys = new Set(existingProducts.map((item) => item.name.trim().toUpperCase()));
    const barcodeKeys = new Set(existingProducts.map((item) => item.barcode?.trim()).filter(Boolean));
    const categoryKeys = new Set(existingCategories.map((item) => (item.categoryName ?? "").trim().toUpperCase()));
    const customerKeys = new Set(existingCustomers.map((item) => `${item.name.trim().toUpperCase()}::${item.phone ?? ""}`));

    const products = parsed.products ?? [];
    const categories = parsed.categories ?? [];
    const customers = parsed.customers ?? [];

    return {
      valid: true,
      mode: "dry_run",
      duplicateHandling: "Existing categories, products, barcodes, and customers are flagged for skip/update before a restore is allowed.",
      counts: {
        products: products.length,
        categories: categories.length,
        customers: customers.length,
        duplicateProducts: products.filter((item) => item.name && productKeys.has(item.name.trim().toUpperCase())).length,
        duplicateBarcodes: products.filter((item) => item.barcode && barcodeKeys.has(item.barcode.trim())).length,
        duplicateCategories: categories.filter((item) => item.categoryName && categoryKeys.has(item.categoryName.trim().toUpperCase())).length,
        duplicateCustomers: customers.filter((item) => item.name && customerKeys.has(`${item.name.trim().toUpperCase()}::${item.phone ?? ""}`)).length,
      },
    };
  },

  async buildProductCatalogWorkbook() {
    const { companyId } = await requireCompanyManager();
    const products = await prisma.product.findMany({
      where: { companyId, isDeleted: false },
      include: { category: true, preferredSupplier: true },
      orderBy: { name: "asc" },
    });
    const rows = products.map((product) => ({
      Product: product.name,
      Barcode: product.barcode ?? "",
      Category: product.category?.categoryName ?? "",
      Generic: product.genericName ?? "",
      Brand: product.brandName ?? "",
      Shelf: product.shelfLocation ?? "",
      Supplier: product.preferredSupplier?.name ?? "",
      Favorite: product.posFavorite ? "Yes" : "No",
      Quantity: toNumber(product.quantity),
      Cost: toNumber(product.cost),
      Price: toNumber(product.price),
      "Inventory Value": toNumber(product.quantity) * toNumber(product.cost),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Products");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  },

  async buildProductCatalogPdf() {
    const { companyId } = await requireCompanyManager();
    const products = await prisma.product.findMany({
      where: { companyId, isDeleted: false },
      include: { category: true },
      orderBy: { name: "asc" },
      take: 45,
    });

    return textPdf(
      "POSARD Product Catalog",
      products.map(
        (product) =>
          `${product.name} | ${product.category?.categoryName ?? "Uncategorized"} | Qty ${toNumber(product.quantity)} | PHP ${toNumber(product.price).toFixed(2)}`,
      ),
    );
  },
};
