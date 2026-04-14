export interface CreateAuditLogInputDto {
  companyId: string;
  actorProfileId: string;
  posTerminalId?: string | null;
  actionType: string;
  referenceId?: string | null;
  changes?: string | null;
  amount?: number | null;
}
