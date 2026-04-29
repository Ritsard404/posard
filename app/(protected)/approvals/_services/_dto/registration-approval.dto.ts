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
  reviewedAt: Date | null;
  rejectionReason: string | null;
  canRegisterAgainAt: Date | null;
  retryUnlockedAt: Date | null;
}

export interface RejectRegistrationRequestInputDto {
  rejectionReason: string | null;
}

export interface ApproveRegistrationRequestInputDto {
  password: string;
}
