import { z } from "zod";

export const AiReportQuestionSchema = z.object({
  question: z.string().trim().min(3).max(500),
  preset: z.enum(["today", "yesterday", "7d", "30d", "thisMonth"]).default("today"),
  companyId: z.string().uuid().optional(),
  terminalId: z.string().uuid().optional(),
});

export type AiReportQuestionInput = z.infer<typeof AiReportQuestionSchema>;
