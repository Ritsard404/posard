import { z } from "zod";
import { PaginationQuerySchema } from "./common.dto";

export const AdminTerminalStatusFilterSchema = z.enum(["active", "inactive", "in_use"]).optional();

export const AdminTerminalListQuerySchema = PaginationQuerySchema.extend({
  companyId: z.string().uuid().optional(),
  status: AdminTerminalStatusFilterSchema,
});

export type AdminTerminalListQueryInput = z.input<typeof AdminTerminalListQuerySchema>;
export type AdminTerminalListQuery = z.infer<typeof AdminTerminalListQuerySchema>;

export interface AdminTerminalListItemDto {
  id: string;
  companyId: string;
  companyName: string;
  posName: string | null;
  registeredName: string | null;
  approvalStatus: "active" | "inactive" | "in_use";
  assignedUserName: string | null;
  createdAt: Date;
  isActive: boolean;
  isInUse: boolean;
  subscriptionStatus: "pending" | "active" | "expired" | "suspended" | "cancelled" | null;
  subscriptionExpiresAt: Date | null;
}
