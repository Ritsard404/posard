import "server-only";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { CategoryDto } from "@/app/(protected)/inventory/_services/_dto/category.dto";

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

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const categoryService = {
  /**
   * GET /categories
   * Returns all categories that have products belonging to the current user's
   * company (or products with no company), ordered by name — mirrors the
   * Java QueryDSL query in CategoryServiceImpl.getCategories().
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
   * GET /categories/company
   * Devuelve TODAS las categorías de la empresa del usuario actual,
   * incluyendo las que aún no tienen productos asignados.
   * Usado en la gestión de inventario.
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
   * GET /categories/:id
   * Mirrors CategoryServiceImpl.getCategory()
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
   * POST /categories
   * Mirrors CategoryServiceImpl.newCategory() — checks for duplicate name
   * within the same company (case-insensitive) before creating.
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
   * PUT /categories/:id
   * Mirrors CategoryServiceImpl.updateCategory()
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
   * DELETE /categories/:id
   * Mirrors CategoryServiceImpl.deleteCategory() — soft delete only, blocked
   * if category still has active products.
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