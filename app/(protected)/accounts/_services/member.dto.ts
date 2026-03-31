// ── Shared ────────────────────────────────────────────────────────────────────

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

export interface PageResult<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// ── Admin DTOs ────────────────────────────────────────────────────────────────

export interface AdminInfoDto {
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  company: MemberCompanyDto;
}

export interface MyCashiersDto {
  memberId: string;
  identifier: string;
  approvalStatus: MemberApprovalStatus;
  isActive: boolean;
}

export interface CashierInfoDto {
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  approvalStatus: MemberApprovalStatus;
  isActive: boolean;
  company: MemberCompanyDto;
}

export interface CompanyDto {
  uuid: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  logoImageUrl: string | null;
  approved: boolean;
}

export interface UpdateCompanyDto {
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  logoImageUrl?: string | null;
}

export interface RegisterCashierDto {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  companyId: string;
}

// ── Cashier Drawer DTOs ───────────────────────────────────────────────────────

export interface DrawerStateDto {
  cashInDrawerAmount: number;
  cashOutDrawerAmount: number;
  withdrawnDrawerAmount: number;
  withdrawnDrawerCount: number;
  isCashed: boolean;
}

// ── POS Terminal DTOs ─────────────────────────────────────────────────────────

export interface PosTerminalDto {
  id: string;
  minNumber: string;
  accreditationNumber: string;
  ptuNumber: string;
  dateIssued: string;   // ISO date string YYYY-MM-DD
  validUntil: string;   // ISO date string YYYY-MM-DD
  posName: string;
  registeredName: string;
  operatedBy: string;
  address: string;
  vatTinNumber: string;
  vat: number;
  discountMax: number;
  costCenter: string;
  branchCenter: string;
  useCenter: string;
  dbName: string | null;
  printerName: string;
  resetCounterNo: number;
  resetCounterTrainNo: number;
  zCounterNo: number;
  zCounterTrainNo: number;
  isTrainMode: boolean;
  isRetailType: boolean;
  companyId: string;
  companyName?: string;
}

// Used for create/update — same shape, id is optional on create
export type PosTerminalRequestDto = PosTerminalDto;
