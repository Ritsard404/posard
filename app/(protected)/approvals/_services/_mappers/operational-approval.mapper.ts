import type { OperationalApprovalListItemDto } from "../_dto/operational-approval.dto";

export function mapOperationalApprovalToListItem(input: {
  id: string;
  referenceNumber: string;
  companyId: string;
  terminalId: string | null;
  requestedBy: { fullName: string | null; email: string };
  actionType: string;
  targetType: string;
  targetId: string | null;
  title: string;
  summary: string;
  status: OperationalApprovalListItemDto["status"];
  createdAt: Date;
  updatedAt: Date;
}): OperationalApprovalListItemDto {
  return {
    id: input.id,
    referenceNumber: input.referenceNumber,
    companyId: input.companyId,
    terminalId: input.terminalId,
    requestedByName: input.requestedBy.fullName ?? input.requestedBy.email,
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId,
    title: input.title,
    summary: input.summary,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
