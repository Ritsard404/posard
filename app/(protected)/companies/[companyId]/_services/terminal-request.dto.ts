import { z } from "zod";

export const terminalRequestStatusValues = [
  "pending",
  "approved",
  "fulfilled",
  "rejected",
  "cancelled",
] as const;

export const TerminalRequestSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  requestedById: z.string().uuid(),
  reviewedById: z.string().uuid().nullable(),
  requestedTerminals: z.number().int().min(1),
  status: z.enum(terminalRequestStatusValues),
  notes: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  requestedByName: z.string().nullable(),
  reviewedByName: z.string().nullable(),
});

export type TerminalRequestDTO = z.infer<typeof TerminalRequestSchema>;

export const CreateTerminalRequestSchema = z.object({
  requestedTerminals: z.coerce.number().int().min(1).max(50),
  notes: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().nullable().optional()),
});

export type CreateTerminalRequestPayload = z.input<typeof CreateTerminalRequestSchema>;
export type CreateTerminalRequestInput = z.infer<typeof CreateTerminalRequestSchema>;

export const UpdateTerminalRequestStatusSchema = z.object({
  status: z.enum(terminalRequestStatusValues),
});

export type UpdateTerminalRequestStatusInput = z.infer<typeof UpdateTerminalRequestStatusSchema>;
