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
    reviewedAt: true;
    rejectionReason: true;
    retryUnlockedAt: true;
    updatedAt: true;
  };
}>;

const REGISTRATION_RETRY_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

function getRetryAvailableAt(request: RegistrationRequestRecord) {
  if (request.status !== "rejected") {
    return null;
  }

  if (request.retryUnlockedAt) {
    return request.retryUnlockedAt;
  }

  const baseDate = request.reviewedAt ?? request.updatedAt;
  return new Date(baseDate.getTime() + REGISTRATION_RETRY_WAIT_MS);
}

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
    reviewedAt: request.reviewedAt,
    rejectionReason: request.rejectionReason,
    canRegisterAgainAt: getRetryAvailableAt(request),
    retryUnlockedAt: request.retryUnlockedAt,
  };
}
