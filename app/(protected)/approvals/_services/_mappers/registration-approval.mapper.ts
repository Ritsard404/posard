import type { Prisma } from "@prisma/client";
import type { RegistrationApprovalListItemDto } from "../_dto/registration-approval.dto";

type RegistrationRequestRecord = Prisma.RegistrationRequestGetPayload<{
  select: {
    id: true;
    fullName: true;
    email: true;
    phone: true;
    companyName: true;
    requestedRole: true;
    status: true;
    createdAt: true;
  };
}>;

export function mapRegistrationRequestToListItem(
  request: RegistrationRequestRecord,
): RegistrationApprovalListItemDto {
  return {
    id: request.id,
    fullName: request.fullName,
    email: request.email,
    phone: request.phone,
    companyName: request.companyName,
    requestedRole: request.requestedRole,
    status: request.status,
    createdAt: request.createdAt,
  };
}
