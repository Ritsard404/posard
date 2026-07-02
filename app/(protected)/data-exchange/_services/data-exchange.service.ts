import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { buildSpreadsheetXml } from "@/lib/export/spreadsheet-xml";

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

const PRODUCT_CATALOG_PDF_ROW_LIMIT = 45;
const BACKUP_STREAM_PAGE_SIZE = 250;

type BackupTableName =
  | "categories"
  | "suppliers"
  | "products"
  | "customers"
  | "invoices"
  | "stockMovements"
  | "stockLots"
  | "users"
  | "settings"
  | "expenses"
  | "nonSalesIncomes";

async function countBackupRows(companyId: string, includeSensitive: boolean) {
  const [
    categories,
    suppliers,
    products,
    customers,
    invoices,
    stockMovements,
    stockLots,
    users,
    terminals,
    expenses,
    nonSalesIncomes,
  ] = await Promise.all([
    prisma.category.count({ where: { companyId } }),
    prisma.supplier.count({ where: { companyId } }),
    prisma.product.count({ where: { companyId, isDeleted: false } }),
    prisma.customer.count({ where: { companyId } }),
    prisma.invoice.count({ where: { posTerminal: { companyId } } }),
    prisma.stockMovement.count({ where: { companyId } }),
    prisma.stockLot.count({ where: { companyId } }),
    includeSensitive ? prisma.profile.count({ where: { companyId } }) : Promise.resolve(0),
    prisma.posTerminalInfo.count({ where: { companyId } }),
    prisma.expense.count({ where: { companyId } }),
    prisma.nonSalesIncome.count({ where: { companyId } }),
  ]);

  return {
    categories,
    suppliers,
    products,
    customers,
    invoices,
    stockMovements,
    stockLots,
    users,
    settings: terminals,
    expenses,
    nonSalesIncomes,
  } satisfies Record<BackupTableName, number>;
}

async function streamRowsById<T extends { id: string }>(
  write: (chunk: string) => void,
  fetchPage: (cursor: string | null) => Promise<T[]>,
) {
  let cursor: string | null = null;
  let first = true;

  while (true) {
    const rows = await fetchPage(cursor);
    if (rows.length === 0) break;

    for (const row of rows) {
      write(`${first ? "" : ","}${JSON.stringify(row)}`);
      first = false;
    }

    cursor = rows[rows.length - 1]?.id ?? null;
    if (rows.length < BACKUP_STREAM_PAGE_SIZE || !cursor) break;
  }
}

export const dataExchangeService = {
  async getExportHistory() {
    const { companyId } = await requireCompanyManager();
    const logs = await prisma.auditLog.findMany({
      where: {
        companyId,
        actionType: {
          in: [
            "SECURITY_REPORT_EXPORT",
            "SECURITY_DATA_BACKUP_EXPORT",
            "SECURITY_PRODUCT_CATALOG_EXPORT",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        actionType: true,
        changes: true,
        createdAt: true,
        actorProfile: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return logs.map((log) => {
      let metadata: Record<string, unknown> = {};
      try {
        const parsed = log.changes ? JSON.parse(log.changes) : {};
        metadata =
          parsed && typeof parsed === "object" && "metadata" in parsed
            ? (parsed.metadata as Record<string, unknown>)
            : {};
      } catch {
        metadata = {};
      }

      return {
        id: log.id,
        actionType: log.actionType.replace(/^SECURITY_/, ""),
        actorName: log.actorProfile.fullName ?? log.actorProfile.email ?? "Unknown",
        exportType: String(metadata.exportType ?? "export"),
        format: String(metadata.format ?? "unknown"),
        rowCount: Number(metadata.rowCount ?? 0),
        fileSize: typeof metadata.fileSize === "number" ? metadata.fileSize : null,
        createdAt: log.createdAt.toISOString(),
      };
    });
  },

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

  async buildBackupStream(input: { includeSensitive: boolean }) {
    const { companyId } = await requireCompanyManager();
    const tableCounts = await countBackupRows(companyId, input.includeSensitive);
    const encoder = new TextEncoder();
    const exportedAt = new Date().toISOString();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        const writeJsonField = (key: string, value: unknown, prefix = ",") => {
          write(`${prefix}${JSON.stringify(key)}:${JSON.stringify(value)}`);
        };
        const writeArrayField = async <T extends { id: string }>(
          key: BackupTableName,
          fetchPage: (cursor: string | null) => Promise<T[]>,
        ) => {
          write(`,${JSON.stringify(key)}:[`);
          await streamRowsById(write, fetchPage);
          write("]");
        };

        try {
          const company = await prisma.company.findUnique({ where: { id: companyId } });
          write("{");
          writeJsonField("version", 2, "");
          writeJsonField("exportedAt", exportedAt);
          writeJsonField("scope", input.includeSensitive ? "full-admin" : "operational");
          writeJsonField("company", company);

          await writeArrayField("categories", (cursor) =>
            prisma.category.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("suppliers", (cursor) =>
            prisma.supplier.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("products", (cursor) =>
            prisma.product.findMany({
              where: { companyId, isDeleted: false },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("customers", (cursor) =>
            prisma.customer.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("invoices", (cursor) =>
            prisma.invoice.findMany({
              where: { posTerminal: { companyId } },
              include: { items: true, ePayments: true },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("stockMovements", (cursor) =>
            prisma.stockMovement.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("stockLots", (cursor) =>
            prisma.stockLot.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          if (input.includeSensitive) {
            await writeArrayField("users", (cursor) =>
              prisma.profile.findMany({
                where: { companyId },
                orderBy: { id: "asc" },
                take: BACKUP_STREAM_PAGE_SIZE,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: { id: true, email: true, fullName: true, role: true, status: true },
              }),
            );
          } else {
            writeJsonField("users", []);
          }
          const terminals = await prisma.posTerminalInfo.findMany({ where: { companyId } });
          writeJsonField("settings", { terminals });
          await writeArrayField("expenses", (cursor) =>
            prisma.expense.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await writeArrayField("nonSalesIncomes", (cursor) =>
            prisma.nonSalesIncome.findMany({
              where: { companyId },
              orderBy: { id: "asc" },
              take: BACKUP_STREAM_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          write("}");
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream, tableCounts };
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

  async buildProductCatalogSpreadsheet() {
    const { companyId } = await requireCompanyManager();
    const products = await prisma.product.findMany({
      where: { companyId, isDeleted: false },
      include: { category: true, preferredSupplier: true },
      orderBy: { name: "asc" },
    });
    const headers = [
      "Product",
      "Barcode",
      "Category",
      "Generic",
      "Brand",
      "Shelf",
      "Supplier",
      "Favorite",
      "Quantity",
      "Cost",
      "Price",
      "Inventory Value",
    ];
    const rows = products.map((product) => [
      product.name,
      product.barcode ?? "",
      product.category?.categoryName ?? "",
      product.genericName ?? "",
      product.brandName ?? "",
      product.shelfLocation ?? "",
      product.preferredSupplier?.name ?? "",
      product.posFavorite ? "Yes" : "No",
      toNumber(product.quantity),
      toNumber(product.cost),
      toNumber(product.price),
      toNumber(product.quantity) * toNumber(product.cost),
    ]);

    return buildSpreadsheetXml({
      sheets: [
        {
          name: "Products",
          rows: [headers, ...rows],
        },
      ],
    });
  },

  async countProductCatalogExportRows(format: "pdf" | "xls") {
    const { companyId } = await requireCompanyManager();
    const productCount = await prisma.product.count({
      where: { companyId, isDeleted: false },
    });

    return format === "pdf"
      ? Math.min(productCount, PRODUCT_CATALOG_PDF_ROW_LIMIT)
      : productCount;
  },

  async buildProductCatalogPdf() {
    const { companyId } = await requireCompanyManager();
    const products = await prisma.product.findMany({
      where: { companyId, isDeleted: false },
      include: { category: true },
      orderBy: { name: "asc" },
      take: PRODUCT_CATALOG_PDF_ROW_LIMIT,
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
