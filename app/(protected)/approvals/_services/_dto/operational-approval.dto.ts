export type OperationalApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "executed";

export interface OperationalApprovalListItemDto {
  id: string;
  referenceNumber: string;
  companyId: string;
  terminalId: string | null;
  requestedByName: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  title: string;
  summary: string;
  status: OperationalApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecideOperationalApprovalInputDto {
  note?: string | null;
}
