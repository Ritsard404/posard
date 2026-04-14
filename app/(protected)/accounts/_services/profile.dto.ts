import type { UserStatus } from "@prisma/client";

// ── Shared ─────────────────────────────────────────────────────────────────────

export interface ProfileCompanyDto {
  id: string | null;
  name: string | null;
  code: string | null;
  email: string | null;
  phone: string | null;
  logoImageUrl: string | null;
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
  profileId: string;
  fullName: string | null;
  email: string;
  company: ProfileCompanyDto;
}

export interface MyCashiersDto {
  profileId: string;
  email: string;
  status: UserStatus;
  isActive: boolean;
}

export interface CashierInfoDto {
  profileId: string;
  fullName: string | null;
  email: string;
  status: UserStatus;
  isActive: boolean;
  company: ProfileCompanyDto;
}

export interface CompanyDto {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  logoImageUrl: string | null;
  isApproved: boolean;
}

export interface UpdateCompanyDto {
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  logoImageUrl?: string | null;
}

export interface RegisterCashierDto {
  email: string;
  fullName?: string | null;
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
  dateIssued: string;
  validUntil: string;
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
  companyId: string;
  companyName?: string;
}

export type PosTerminalRequestDto = PosTerminalDto;
