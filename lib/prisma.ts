import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  const defaultPoolSize = process.env.NODE_ENV === "production" ? 10 : 3;
  const configuredPoolSize = Number(
    process.env.DATABASE_CONNECTION_LIMIT ?? defaultPoolSize,
  );
  const max = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
    ? configuredPoolSize
    : defaultPoolSize;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max,
  });
  return new PrismaClient({ adapter });
}

// Prevent multiple PrismaClient instances in dev (hot reload creates new modules)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
