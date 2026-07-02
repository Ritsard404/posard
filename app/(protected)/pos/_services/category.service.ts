import "server-only";
import { prisma } from "@/lib/prisma";
import { CategoryDto } from "./_dto/pos.dto";

export const categoryService = {
  async getCategories(
    companyId?: string,
    options: { changedSince?: Date } = {},
  ): Promise<CategoryDto[]> {
    const categories = await prisma.category.findMany({
      where: {
        isDeleted: false,
        ...(companyId ? { companyId } : {}),
        ...(options.changedSince ? { updatedAt: { gt: options.changedSince } } : {}),
      },
      select: {
        id: true,
        categoryName: true,
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return categories.map(c => ({
      id: c.id,
      categoryName: c.categoryName || "Unnamed Category",
    }));
  }
};
