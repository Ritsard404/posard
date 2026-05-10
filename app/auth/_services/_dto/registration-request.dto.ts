import type { RegistrationRequestStatus, UserRole } from "@prisma/client";

export interface SubmitRegistrationRequestInputDto {
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  requestedRole: Extract<UserRole, "manager">;
  password?: string;
}

export interface RegistrationRequestLoginStatusDto {
  status: RegistrationRequestStatus | "none";
  rejectionReason: string | null;
  canRegisterAgainAt: string | null;
}

export type SubmitRegistrationResultDto =
  | { mode: "pending_approval" }
  | { mode: "direct"; email: string };
