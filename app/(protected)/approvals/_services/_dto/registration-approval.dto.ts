import type { RegistrationRequestStatus, UserRole } from "@prisma/client";

export interface RegistrationApprovalListItemDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  requestedRole: UserRole;
  status: RegistrationRequestStatus;
  createdAt: Date;
}

export interface RejectRegistrationRequestInputDto {
  rejectionReason: string | null;
}
