import type { UserRole, UserStatus } from "@prisma/client";

export type AccountsViewerRole = Extract<UserRole, "admin" | "manager">;
export type ManagedAccountRole = Extract<UserRole, "manager" | "cashier">;

export interface AccountsViewerDto {
  profileId: string;
  userId: string;
  companyId: string | null;
  role: AccountsViewerRole;
  fullName: string | null;
  email: string;
}

export interface AccountCompanyOptionDto {
  id: string;
  name: string;
}

export interface AccountPermissionsDto {
  canApprove: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AccountListItemDto extends AccountPermissionsDto {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: UserStatus;
  company: {
    id: string | null;
    name: string | null;
  };
  isSelf: boolean;
}

export interface AccountDetailDto extends AccountListItemDto {
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetAccountsInputDto {
  keyword?: string;
  status?: UserStatus;
  role?: ManagedAccountRole;
  companyId?: string;
}

export interface CreateAccountInputDto {
  email: string;
  fullName: string | null;
  role: ManagedAccountRole;
  companyId: string;
}

export interface UpdateAccountInputDto {
  fullName: string | null;
  companyId: string;
}

export interface UpdateOwnProfileInputDto {
  fullName: string | null;
}
