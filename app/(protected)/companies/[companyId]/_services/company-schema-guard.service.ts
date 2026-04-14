import { Prisma } from "@prisma/client";

function isMissingRelationTableError(error: unknown, tableNames: string[]) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021") {
    return false;
  }

  const metaTable =
    typeof error.meta?.table === "string" ? error.meta.table : "";
  const message = typeof error.message === "string" ? error.message : "";

  return tableNames.some(
    (tableName) =>
      metaTable === tableName || message.includes(`table \`${tableName}\``),
  );
}

export async function withOptionalCompanyTable<T>(
  loader: () => Promise<T>,
  fallback: T,
  tableName: string | string[],
): Promise<T> {
  const tableNames = Array.isArray(tableName) ? tableName : [tableName];

  try {
    return await loader();
  } catch (error) {
    if (isMissingRelationTableError(error, tableNames)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[companies] ${tableNames.join(", ")} is missing in the current database. Returning fallback data until migrations are applied.`,
        );
      }

      return fallback;
    }

    throw error;
  }
}
