import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth/current-user";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function getCompanyId(): Promise<string | null> {
const profile = await getCurrentProfile();
return profile?.companyId ?? null;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const categoryService = {
/**

GET /categories

Returns all categories with products belonging to your company.

Includes products with no company. Orders results by name.

This mirrors the Java QueryDSL query in CategoryServiceImpl.getCategories
*/
async findAll(): Promise<CategoryDto[]> {
const companyId = await getCompanyId();

const categories = await prisma.category.findMany({
  where: {
    isDeleted: false,
    products: {
      some: {
        isDeleted: false,
        ...(companyId
          ? {
              OR: [
                { companyId },
                { companyId: null },
              ],
            }
          : {}),
      },
    },
  },
  select: {
    id: true,
    categoryName: true,
  },
  orderBy: { categoryName: "asc" },
});

return categories.map((c) => ({
  id: c.id,
  categoryName: c.categoryName ?? "",
}));
},

/**

GET /categories/company

Returns all categories for your company.

Includes categories without assigned products.

Use this for inventory management.
*/
async findAllByCompany(): Promise<CategoryDto[]> {
const companyId = await getCompanyId();

const categories = await prisma.category.findMany({
  where: {
    isDeleted: false,
    ...(companyId ? { companyId } : {}),
  },
  select: {
    id: true,
    categoryName: true,
  },
  orderBy: { categoryName: "asc" },
});

return categories.map((c) => ({
  id: c.id,
  categoryName: c.categoryName ?? "",
}));
},

/**

GET /categories/:id

Mirrors CategoryServiceImpl.getCategory
*/
async findById(id: string): Promise<CategoryDto | null> {
const category = await prisma.category.findFirst({
where: { id, isDeleted: false },
select: { id: true, categoryName: true },
});

if (!category) return null;

return {
  id: category.id,
  categoryName: category.categoryName ?? "",
};
},

/**

POST /categories

Mirrors CategoryServiceImpl.newCategory.

Checks for duplicate name within your company before creating.

Uses case insensitive matching.
*/
async create(dto: Pick<CategoryDto, "categoryName">): Promise<void> {
const companyId = await getCompanyId();
if (!companyId) throw new Error("No company associated with this account.");

const name = dto.categoryName.trim();

const exists = await prisma.category.findFirst({
  where: {
    categoryName: { equals: name, mode: "insensitive" },
    companyId,
    isDeleted: false,
  },
});

if (exists) {
  throw new Error(`Category '${name}' already exists in your company.`);
}

await prisma.category.create({
  data: {
    categoryName: name,
    companyId,
  },
});
},

/**

PUT /categories/:id

Mirrors CategoryServiceImpl.updateCategory
*/
async update(
id: string,
dto: Pick<CategoryDto, "categoryName">,
): Promise<void> {
const category = await prisma.category.findFirst({
where: { id, isDeleted: false },
});

if (!category) throw new Error("Category not found.");

const name =
  dto.categoryName.trim().charAt(0).toUpperCase() +
  dto.categoryName.trim().slice(1).toLowerCase();

await prisma.category.update({
  where: { id },
  data: { categoryName: name },
});
},

/**

DELETE /categories/:id

Mirrors CategoryServiceImpl.deleteCategory.

Uses soft delete only.

Blocked if category still has active products.
*/
async delete(id: string): Promise<void> {
const hasProducts = await prisma.product.findFirst({
where: { categoryId: id, isDeleted: false },
select: { id: true },
});

if (hasProducts) {
  throw new Error("Cannot delete a category that still has products.");
}

const category = await prisma.category.findFirst({
  where: { id, isDeleted: false },
});

if (!category) throw new Error("Category not found.");

await prisma.category.update({
  where: { id },
  data: {
    isDeleted: true,
    deletedAt: new Date(),
  },
});
},
};
