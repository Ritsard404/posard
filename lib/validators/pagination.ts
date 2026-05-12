import { z } from "zod";
import { securityConfig } from "@/lib/security/security-config";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(securityConfig.pagination.maxLimit)
    .default(securityConfig.pagination.defaultLimit),
});

export function clampPagination(input: { page?: unknown; limit?: unknown }) {
  return paginationSchema.parse(input);
}
