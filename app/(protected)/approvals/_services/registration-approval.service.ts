import "server-only";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppConfig } from "@/lib/app-config";
import { messagingService } from "@/lib/messaging/email.service";
import { emailTemplates } from "@/lib/messaging/email-templates";
import { notificationService } from "@/app/(protected)/notifications/_services/notification.service";
import type { AccountsViewerDto } from "@/app/(protected)/accounts/_services/_dto/accounts.dto";
import {
  mapRegistrationRequestToListItem,
} from "./_mappers/registration-approval.mapper";
import type {
  ApproveRegistrationRequestInputDto,
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
        reviewedAt: true,
        rejectionReason: true,
        retryUnlockedAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return requests.map(mapRegistrationRequestToListItem);
  },

  async getRejectedRequests(
    viewer: AccountsViewerDto,
  ): Promise<RegistrationApprovalListItemDto[]> {
    assertAdmin(viewer);

    const requests = await prisma.registrationRequest.findMany({
      where: { status: "rejected" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
        requestedRole: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        rejectionReason: true,
        retryUnlockedAt: true,
        updatedAt: true,
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return requests.map(mapRegistrationRequestToListItem);
  },

  async approveRequest(
    viewer: AccountsViewerDto,
    requestId: string,
    input: ApproveRegistrationRequestInputDto,
  ): Promise<void> {
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
    const createUserResult = await adminClient.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: request.fullName,
      },
    });

    const invitedUser = createUserResult.data.user;

    if (createUserResult.error || !invitedUser?.id || !invitedUser.email) {
      throw new Error(
        normalizeAuthError(
          createUserResult.error?.message ?? "Failed to create the Supabase Auth user.",
        ),
      );
    }

    const invitedEmail = normalizeEmail(invitedUser.email);

    let createdProfileId: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.create({
          data: {
            userId: invitedUser.id,
            email: invitedEmail,
            fullName: request.fullName,
            role: request.requestedRole,
            status: "active",
            approvedAt: new Date(),
          },
        });
        createdProfileId = profile.id;

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

    if (createdProfileId) {
      await notificationService.create({
        profileId: createdProfileId,
        category: "REGISTRATION",
        type: "manager_registration_approved",
        title: "Registration approved",
        body: "Your POSard account is active.",
        href: "/dashboard",
        relatedEntityType: "registration_request",
        relatedEntityId: request.id,
      });
    }

    const config = getAppConfig();
    const template = emailTemplates.accountApproved({
      name: request.fullName,
      appUrl: config.appUrl ? `${config.appUrl}/auth/login` : undefined,
    });
    await messagingService.sendEmail({
      to: invitedEmail,
      category: "registration",
      metadata: { requestId: request.id },
      ...template,
    });
  },

  async rejectRequest(
    viewer: AccountsViewerDto,
    requestId: string,
    input: RejectRegistrationRequestInputDto,
  ): Promise<void> {
    assertAdmin(viewer);

    const request = await prisma.registrationRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, email: true },
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
          retryUnlockedById: null,
          retryUnlockedAt: null,
        },
      });

    const template = emailTemplates.managerApprovalResult({
      approved: false,
      reason: input.rejectionReason,
    });
    await messagingService.sendEmail({
      to: request.email,
      category: "registration",
      metadata: { requestId: request.id },
      ...template,
    });
  },

  async unlockRejectedRequest(
    viewer: AccountsViewerDto,
    requestId: string,
  ): Promise<void> {
    assertAdmin(viewer);

    const request = await prisma.registrationRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        email: true,
      },
    });

    if (!request) {
      throw new Error("Registration request not found.");
    }

    if (request.status !== "rejected") {
      throw new Error("Only rejected registration requests can be unlocked.");
    }

    const email = normalizeEmail(request.email);

    const [existingProfile, existingPendingRequest] = await Promise.all([
      prisma.profile.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.registrationRequest.findFirst({
        where: {
          email,
          status: "pending",
          id: { not: request.id },
        },
        select: { id: true },
      }),
    ]);

    if (existingProfile) {
      throw new Error("An active account already exists for this email.");
    }

    if (existingPendingRequest) {
      throw new Error("A pending registration request already exists for this email.");
    }

    await prisma.registrationRequest.update({
      where: { id: request.id },
      data: {
        retryUnlockedById: viewer.profileId,
        retryUnlockedAt: new Date(),
      },
    });
  },
};
