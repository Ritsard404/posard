import "server-only";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import {
  mapRegistrationRequestToListItem,
} from "./_mappers/registration-approval.mapper";
import type {
  RegistrationApprovalListItemDto,
  RejectRegistrationRequestInputDto,
} from "./_dto/registration-approval.dto";

function assertAdmin(viewer: AccountsViewerDto) {
  if (viewer.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getInviteRedirectTo() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/auth/login`;
}

function normalizeAuthError(message: string) {
  if (message.toLowerCase().includes("already")) {
    return "An Auth account already exists for this email.";
  }

  return message;
}

export const registrationApprovalService = {
  async getPendingRequests(
    viewer: AccountsViewerDto,
  ): Promise<RegistrationApprovalListItemDto[]> {
    assertAdmin(viewer);

    const requests = await prisma.registrationRequest.findMany({
      where: { status: "pending" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
        requestedRole: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return requests.map(mapRegistrationRequestToListItem);
  },

  async approveRequest(viewer: AccountsViewerDto, requestId: string): Promise<void> {
    assertAdmin(viewer);

    const request = await prisma.registrationRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        fullName: true,
        email: true,
        requestedRole: true,
        status: true,
      },
    });

    if (!request) {
      throw new Error("Registration request not found.");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending registration requests can be approved.");
    }

    const email = normalizeEmail(request.email);
    const existingProfile = await prisma.profile.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingProfile) {
      throw new Error("A profile already exists for this email.");
    }

    const adminClient = createAdminClient();
    const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
      ...(getInviteRedirectTo() ? { redirectTo: getInviteRedirectTo() } : {}),
      data: {
        full_name: request.fullName,
      },
    });

    const invitedUser = inviteResult.data.user;

    if (inviteResult.error || !invitedUser?.id || !invitedUser.email) {
      throw new Error(
        normalizeAuthError(
          inviteResult.error?.message ?? "Failed to create the Supabase Auth user.",
        ),
      );
    }

    const invitedEmail = normalizeEmail(invitedUser.email);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            userId: invitedUser.id,
            email: invitedEmail,
            fullName: request.fullName,
            role: request.requestedRole,
            status: "active",
            approvedAt: new Date(),
          },
        });

        await tx.registrationRequest.update({
          where: { id: request.id },
          data: {
            status: "approved",
            reviewedById: viewer.profileId,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        });
      });
    } catch (error) {
      await adminClient.auth.admin.deleteUser(invitedUser.id);
      throw error;
    }
  },

  async rejectRequest(
    viewer: AccountsViewerDto,
    requestId: string,
    input: RejectRegistrationRequestInputDto,
  ): Promise<void> {
    assertAdmin(viewer);

    const request = await prisma.registrationRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });

    if (!request) {
      throw new Error("Registration request not found.");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending registration requests can be rejected.");
    }

    await prisma.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: "rejected",
        reviewedById: viewer.profileId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason,
      },
    });
  },
};
