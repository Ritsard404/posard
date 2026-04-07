import "server-only";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Prisma, ItemType, VatType } from "@prisma/client";
import type {
  ProductDto,
  ProductSaveDto,
  PageResponse,
} from "@/app/(protected)/inventory/_services/_dto/product.dto";

// ─────────────────────────────────────────────
// Sortable fields whitelist
// ─────────────────────────────────────────────

const SORTABLE_FIELDS: Record<
  string,
  keyof Prisma.ProductOrderByWithRelationInput
> = {
  name: "name",
  price: "price",
  cost: "cost",
  quantity: "quantity",
  createdAt: "createdAt",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const profile = await prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: { companyId: true },
  });

  return profile?.companyId ?? null;
}

function toProductDto(
  p: Prisma.ProductGetPayload<{ include: { category: true } }>,
): ProductDto {
  return {
    id: p.id,
    name: p.name,
    productImageUrl: p.productImageUrl,
    barcode: p.barcode,
    baseUnit: p.baseUnit,
    quantity: p.quantity ? Number(p.quantity) : null,
    cost: Number(p.cost),
    price: Number(p.price),
    isAvailable: p.isAvailable,
    itemType: p.itemType,
    vatType: p.vatType,
    categoryId: p.categoryId,
    categoryName: p.category?.categoryName ?? null,
  };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const productService = {
  /**
   * GET /products — paginated, filtered list
   * Mirrors ProductServiceImpl.getProducts()
   */
  async findAll(params?: {
    keyword?: string;
    barcode?: string;
    categoryId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<PageResponse<ProductDto>> {
    const companyId = await getCompanyId();

    const page = params?.page ?? 0;
    const size = params?.size ?? 10;
    const sortField = SORTABLE_FIELDS[params?.sortBy ?? ""] ?? "name";
    const direction = params?.direction === "desc" ? "desc" : "asc";

    // Construir las condiciones AND para evitar colisión de claves OR
    const andConditions: Prisma.ProductWhereInput[] = [];

    if (params?.keyword) {
      andConditions.push({
        OR: [
          { name: { contains: params.keyword, mode: "insensitive" } },
          { barcode: { contains: params.keyword, mode: "insensitive" } },
        ],
      });
    }

    if (companyId) {
      andConditions.push({
        OR: [{ companyId }, { companyId: null }],
      });
    }

    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      ...(params?.barcode && { barcode: params.barcode }),
      ...(params?.categoryId && { categoryId: params.categoryId }),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    const [products, totalElements] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip: page * size,
        take: size,
        orderBy: { [sortField]: direction },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    return {
      content: products.map(toProductDto),
      page,
      size,
      totalElements,
      totalPages,
      hasNext: page + 1 < totalPages,
      hasPrevious: page > 0,
    };
  },

  /**
   * GET /products/:id
   * Mirrors ProductServiceImpl.getProduct()
   */
  async findById(id: string): Promise<ProductDto | null> {
    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: { category: true },
    });

    if (!product) return null;
    return toProductDto(product);
  },

  /**
   * GET /products/by-category/:categoryId — for POS screen
   * Mirrors ProductServiceImpl.getProductsByCategory()
   * Only returns available (isAvailable = true) products.
   */
  async findByCategory(params: {
    categoryId: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "asc" | "desc";
  }): Promise<ProductDto[]> {
    const companyId = await getCompanyId();

    const page = params?.page ?? 0;
    const size = params?.size ?? 10;
    const sortField = SORTABLE_FIELDS[params?.sortBy ?? ""] ?? "name";
    const direction = params?.direction === "desc" ? "desc" : "asc";

    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isAvailable: true,
        categoryId: params.categoryId,
        ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
      },
      include: { category: true },
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
    });

    return products.map(toProductDto);
  },

  /**
   * POST /products
   * Mirrors ProductServiceImpl.newProduct()
   * Finds or creates the category, then saves the product.
   */
  async create(dto: ProductSaveDto): Promise<void> {
    const companyId = await getCompanyId();
    if (!companyId) throw new Error("No company associated with this account.");

    const category = await resolveCategory({
      categoryId: dto.categoryId,
      categoryName: dto.categoryName,
      companyId,
    });

    const duplicate = await prisma.product.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        categoryId: category.id,
        isDeleted: false,
      },
    });

    if (duplicate) {
      throw new Error("Product name already exists in this category.");
    }

    await prisma.product.create({
      data: {
        name: dto.name.trim(),
        barcode: dto.barcode ?? null,
        baseUnit: dto.baseUnit ?? "UNIT",
        quantity: dto.quantity ?? null,
        cost: dto.cost ?? 0,
        price: dto.price,
        isAvailable: dto.isAvailable ?? true,
        itemType: (dto.itemType as ItemType) ?? "RESALE",
        vatType: (dto.vatType as VatType) ?? "VATABLE",
        productImageUrl: dto.productImageUrl ?? null,
        categoryId: category.id,
        companyId,
      },
    });
  },

  /**
   * POST /products/batch — bulk create from CSV parse result
   * Mirrors ProductServiceImpl.newProducts()
   */
  async createMany(dtos: ProductSaveDto[]): Promise<void> {
    const companyId = await getCompanyId();
    if (!companyId) throw new Error("No company associated with this account.");

    // Cache categories (case-insensitive) — mirrors Java categoryCache map
    const existingCategories = await prisma.category.findMany({
      where: { companyId, isDeleted: false },
      select: { id: true, categoryName: true },
    });

    const categoryCache = new Map(
      existingCategories.map((c) => [
        c.categoryName?.toUpperCase() ?? "",
        c.id,
      ]),
    );

    const productsToCreate: Prisma.ProductCreateManyInput[] = [];

    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];

      if (!dto.name || dto.price == null) {
        throw new Error(
          `Row ${i + 1} is invalid: name and price are required.`,
        );
      }

      const catName = (dto.categoryName ?? "Uncategorized")
        .trim()
        .toUpperCase();
      let categoryId = categoryCache.get(catName);

      if (!categoryId) {
        const newCat = await prisma.category.create({
          data: { categoryName: catName, companyId },
        });
        categoryCache.set(catName, newCat.id);
        categoryId = newCat.id;
      }

      const duplicate = await prisma.product.findFirst({
        where: {
          name: { equals: dto.name, mode: "insensitive" },
          categoryId,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new Error(
          `Row ${i + 1}: Product '${dto.name}' already exists in ${catName}.`,
        );
      }

      productsToCreate.push({
        name: dto.name.trim(),
        barcode: dto.barcode ?? null,
        baseUnit: dto.baseUnit ?? "UNIT",
        quantity: dto.quantity ?? null,
        cost: dto.cost ?? 0,
        price: dto.price,
        isAvailable: dto.isAvailable ?? true,
        itemType: (dto.itemType as ItemType) ?? "RESALE",
        vatType: (dto.vatType as VatType) ?? "VATABLE",
        categoryId,
        companyId,
      });
    }

    await prisma.product.createMany({ data: productsToCreate });
  },

  /**
   * PUT /products/:id
   * Mirrors ProductServiceImpl.editProduct()
   */
  async update(id: string, dto: ProductSaveDto): Promise<void> {
    const companyId = await getCompanyId();
    if (!companyId) throw new Error("No company associated with this account.");

    const existing = await prisma.product.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new Error("Product not found.");

    const category = await resolveCategory({
      categoryId: dto.categoryId,
      categoryName: dto.categoryName,
      companyId,
    });

    const duplicate = await prisma.product.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        categoryId: category.id,
        isDeleted: false,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new Error("Product name already exists in this category.");
    }

    await prisma.product.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        barcode: dto.barcode ?? null,
        baseUnit: dto.baseUnit ?? existing.baseUnit,
        quantity: dto.quantity ?? existing.quantity,
        cost: dto.cost ?? existing.cost,
        price: dto.price,
        isAvailable: dto.isAvailable ?? existing.isAvailable,
        itemType: (dto.itemType as ItemType) ?? existing.itemType,
        vatType: (dto.vatType as VatType) ?? existing.vatType,
        productImageUrl: dto.productImageUrl ?? existing.productImageUrl,
        categoryId: category.id,
      },
    });
  },

  /**
   * DELETE /products/:id — soft delete
   * Mirrors ProductServiceImpl.deleteProduct()
   */
  async delete(id: string): Promise<void> {
    const existing = await prisma.product.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new Error("Product not found.");

    await prisma.product.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  },

  /**
   * Parses a CSV text string into ProductSaveDto[]
   * Mirrors ProductServiceImpl.parseCsv()
   * CSV columns: Product Name, Category Name, Price, Quantity, Cost, Base Unit
   */
  parseCsv(csvText: string): ProductSaveDto[] {
    const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
    const result: ProductSaveDto[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 4) continue;

      result.push({
        name: cols[0]?.trim() ?? "",
        categoryName: cols[1]?.trim() ?? "",
        price: parseFloat(cols[2]?.trim() ?? "0") || 0,
        quantity: parseFloat(cols[3]?.trim() ?? "0") || 0,
        cost: parseFloat(cols[4]?.trim() ?? "0") || 0,
        baseUnit: cols[5]?.trim() || "UNIT",
      });
    }

    return result;
  },

  /**
   * Generates a CSV template string (mirrors generateCsvTemplate)
   */
  generateCsvTemplate(): string {
    return [
      "Product Name,Category Name,Price,Quantity,Cost,Base Unit",
      "Sample Item,Category A,100.00,5,80.00,UNIT",
    ].join("\n");
  },
};

// ─────────────────────────────────────────────
// Internal: resolves or creates a category
// Mirrors the Optional.ofNullable().flatMap()...orElseGet() chain in Java
// ─────────────────────────────────────────────

async function resolveCategory(params: {
  categoryId?: string;
  categoryName?: string;
  companyId: string;
}): Promise<{ id: string }> {
  const { categoryId, categoryName, companyId } = params;

  // 1. Try by ID first
  if (categoryId) {
    const byId = await prisma.category.findFirst({
      where: { id: categoryId, companyId, isDeleted: false },
      select: { id: true },
    });
    if (byId) return byId;
  }

  // 2. Try by name (case-insensitive)
  if (categoryName) {
    const byName = await prisma.category.findFirst({
      where: {
        categoryName: { equals: categoryName.trim(), mode: "insensitive" },
        companyId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (byName) return byName;
  }

  // 3. Create if not found
  const name = (categoryName ?? "Uncategorized").trim().toUpperCase();
  const created = await prisma.category.create({
    data: { categoryName: name, companyId },
    select: { id: true },
  });
  return created;
}
