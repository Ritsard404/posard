export interface MemberCompanyDto {
  code: string | null;
  email: string | null;
  logoImageUrl: string | null;
  name: string | null;
  phone: string | null;
  uuid: string | null;
}
export type MemberApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PermissionType = "manager" | "admin" | "cashier";

export interface MemberListItem {
  memberId: string;
  identifier: string;
  approvalStatus: MemberApprovalStatus;
  isActive: boolean;
  permission: PermissionType;
  company: MemberCompanyDto;
}
