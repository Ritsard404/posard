import { z } from "zod";

export const paginationSizeValues = [10, 20, 50] as const;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z
    .coerce
    .number()
    .int()
    .refine((value) => paginationSizeValues.includes(value as (typeof paginationSizeValues)[number]), {
      message: "Invalid page size",
    })
    .default(10),
  keyword: z.string().trim().optional().transform((value) => value || undefined),
});

export type PaginationQueryInput = z.input<typeof PaginationQuerySchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PageResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

