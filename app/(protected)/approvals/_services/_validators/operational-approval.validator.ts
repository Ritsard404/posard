import { z } from "zod";

export const decideOperationalApprovalSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export type DecideOperationalApprovalInput = z.infer<
  typeof decideOperationalApprovalSchema
>;
