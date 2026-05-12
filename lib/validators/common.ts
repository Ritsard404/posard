import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const searchQuerySchema = z
  .string()
  .trim()
  .max(120)
  .refine((value) => !/[%*]{3,}/.test(value), "Search query is too broad.");

export const isoDateStringSchema = z.string().trim().refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}, "Invalid date.");

export const reportFormatSchema = z.enum(["csv", "xlsx"]).default("csv");
