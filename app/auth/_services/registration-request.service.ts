import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  RegistrationRequestLoginStatusDto,
  SubmitRegistrationRequestInputDto,
} from "./_dto/registration-request.dto";

const REGISTRATION_RETRY_WAIT_DAYS = 7;
const REGISTRATION_RETRY_WAIT_MS = REGISTRATION_RETRY_WAIT_DAYS * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getRetryAvailableAt(input: {
  reviewedAt: Date | null;
  retryUnlockedAt: Date | null;
  updatedAt: Date;
}) {
  if (input.retryUnlockedAt) {
    return input.retryUnlockedAt;
  }

  const baseDate = input.reviewedAt ?? input.updatedAt;
  return new Date(baseDate.getTime() + REGISTRATION_RETRY_WAIT_MS);
}

function formatRetryBlockedMessage(canRegisterAgainAt: Date) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(canRegisterAgainAt);

  return `The previous registration request for this email was rejected. You can submit a new request again on ${formatted}, or ask an admin to allow re-registration sooner.`;
}

export const registrationRequestService = {
  async submitRequest(input: SubmitRegistrationRequestInputDto): Promise<void> {
    const email = normalizeEmail(input.email);

    const [existingProfile, existingPendingRequest, latestRejectedRequest] =
      await Promise.all([
      prisma.profile.findUnique({
        where: { email },
        select: { id: true, status: true },
      }),
      prisma.registrationRequest.findFirst({
        where: { email, status: "pending" },
        select: { id: true },
      }),
      prisma.registrationRequest.findFirst({
        where: { email, status: "rejected" },
        orderBy: [{ reviewedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
          reviewedAt: true,
          retryUnlockedAt: true,
          updatedAt: true,
        },
      }),
    ]);

    if (existingProfile) {
      throw new Error("An account already exists for this email. Please log in or contact an admin.");
    }

    if (existingPendingRequest) {
      throw new Error("A pending registration request already exists for this email.");
    }

    if (latestRejectedRequest) {
      const canRegisterAgainAt = getRetryAvailableAt(latestRejectedRequest);

      if (Date.now() < canRegisterAgainAt.getTime()) {
        throw new Error(formatRetryBlockedMessage(canRegisterAgainAt));
      }
    }

    await prisma.registrationRequest.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone: input.phone,
        companyName: input.companyName,
        requestedRole: input.requestedRole,
        status: "pending",
      },
    });
  },

  async getLoginStatusByEmail(
    rawEmail: string,
  ): Promise<RegistrationRequestLoginStatusDto> {
    const email = normalizeEmail(rawEmail);

    const request = await prisma.registrationRequest.findFirst({
      where: { email },
      orderBy: [{ createdAt: "desc" }],
      select: {
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        retryUnlockedAt: true,
        updatedAt: true,
      },
    });

    if (!request) {
      return {
        status: "none",
        rejectionReason: null,
        canRegisterAgainAt: null,
      };
    }

    const canRegisterAgainAt =
      request.status === "rejected"
        ? getRetryAvailableAt(request).toISOString()
        : null;

    return {
      status: request.status,
      rejectionReason: request.rejectionReason,
      canRegisterAgainAt,
    };
  },
};
