import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  RegistrationRequestLoginStatusDto,
  SubmitRegistrationRequestInputDto,
} from "./_dto/registration-request.dto";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const registrationRequestService = {
  async submitRequest(input: SubmitRegistrationRequestInputDto): Promise<void> {
    const email = normalizeEmail(input.email);

    const [existingProfile, existingPendingRequest] = await Promise.all([
      prisma.profile.findUnique({
        where: { email },
        select: { id: true, status: true },
      }),
      prisma.registrationRequest.findFirst({
        where: { email, status: "pending" },
        select: { id: true },
      }),
    ]);

    if (existingProfile) {
      throw new Error("An account already exists for this email. Please log in or contact an admin.");
    }

    if (existingPendingRequest) {
      throw new Error("A pending registration request already exists for this email.");
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
      },
    });

    if (!request) {
      return {
        status: "none",
        rejectionReason: null,
      };
    }

    return {
      status: request.status,
      rejectionReason: request.rejectionReason,
    };
  },
};
