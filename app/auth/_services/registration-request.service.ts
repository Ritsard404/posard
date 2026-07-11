import "server-only";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppConfig } from "@/lib/app-config";
import { messagingService } from "@/lib/messaging/email.service";
import { emailTemplates } from "@/lib/messaging/email-templates";
import { notificationService } from "@/app/(protected)/notifications/_services/notification.service";
import type {
  RegistrationRequestLoginStatusDto,
  SubmitRegistrationRequestInputDto,
  SubmitRegistrationResultDto,
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
  async submitRequest(
    input: SubmitRegistrationRequestInputDto,
  ): Promise<SubmitRegistrationResultDto> {
    const email = normalizeEmail(input.email);
    const config = await getRegistrationConfiguration();

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

    if (config.directRegistrationEnabled) {
      if (!input.password) {
        throw new Error("Password is required for direct registration.");
      }

      const adminClient = createAdminClient();
      const appConfig = getAppConfig();
      const createUserResult = await adminClient.auth.admin.generateLink({
        type: "signup",
        email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
          },
          redirectTo: appConfig.appUrl
            ? `${appConfig.appUrl}/auth/callback`
            : undefined,
        },
      });
      const user = createUserResult.data.user;
      const confirmationUrl = createUserResult.data.properties?.action_link;

      if (createUserResult.error || !user?.id || !user.email || !confirmationUrl) {
        throw new Error(
          createUserResult.error?.message ?? "Failed to create account.",
        );
      }

      let profileId: string | null = null;

      try {
        const profile = await prisma.profile.create({
          data: {
            userId: user.id,
            email: normalizeEmail(user.email),
            fullName: input.fullName.trim(),
            role: "manager",
            status: "active",
            approvedAt: new Date(),
          },
          select: { id: true },
        });
        profileId = profile.id;
      } catch (error) {
        await adminClient.auth.admin.deleteUser(user.id);
        throw error;
      }

      await notificationService.create({
        profileId,
        category: "REGISTRATION",
        type: "direct_registration_created",
        title: "Account created",
        body: "Your POSard account is active. Continue to company setup.",
        href: "/setup-company",
        relatedEntityType: "profile",
        relatedEntityId: profileId,
      });
      const emailResult = await sendEmailConfirmation({
        email,
        fullName: input.fullName.trim(),
        confirmationUrl,
      });

      if (emailResult.status !== "sent") {
        await prisma.profile.delete({ where: { id: profileId } });
        await adminClient.auth.admin.deleteUser(user.id);
        throw new Error("Unable to send the verification email. Please try again.");
      }

      return { mode: "email_confirmation", email };
    }

    const request = await prisma.registrationRequest.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone: input.phone,
        companyName: input.companyName,
        requestedRole: input.requestedRole,
        status: "pending",
      },
    });
    await notifyAdminsOfRegistrationRequest({
      requestId: request.id,
      fullName: input.fullName.trim(),
      email,
      companyName: input.companyName,
    });
    await sendPendingReviewEmail(email, request.id);

    return { mode: "pending_approval" };
  },

  async submitGoogleOAuthRequest(input: {
    userId: string;
    fullName: string;
    email: string;
  }): Promise<SubmitRegistrationResultDto> {
    const email = normalizeEmail(input.email);
    const fullName = input.fullName.trim();
    const config = await getRegistrationConfiguration();

    const [existingProfile, existingPendingRequest, latestRejectedRequest] =
      await Promise.all([
        prisma.profile.findUnique({
          where: { email },
          select: { id: true },
        }),
        prisma.registrationRequest.findFirst({
          where: { email, status: "pending" },
          select: { id: true },
        }),
        prisma.registrationRequest.findFirst({
          where: { email, status: "rejected" },
          orderBy: [
            { reviewedAt: "desc" },
            { updatedAt: "desc" },
            { createdAt: "desc" },
          ],
          select: {
            reviewedAt: true,
            retryUnlockedAt: true,
            updatedAt: true,
          },
        }),
      ]);

    if (existingProfile) {
      throw new Error("An account already exists for this email. Please log in.");
    }

    if (existingPendingRequest) {
      return { mode: "pending_approval" };
    }

    if (latestRejectedRequest) {
      const canRegisterAgainAt = getRetryAvailableAt(latestRejectedRequest);

      if (Date.now() < canRegisterAgainAt.getTime()) {
        throw new Error(formatRetryBlockedMessage(canRegisterAgainAt));
      }
    }

    if (config.directRegistrationEnabled) {
      const profile = await prisma.profile.create({
        data: {
          userId: input.userId,
          email,
          fullName,
          role: "manager",
          status: "active",
          approvedAt: new Date(),
        },
        select: { id: true },
      });

      await notificationService.create({
        profileId: profile.id,
        category: "REGISTRATION",
        type: "direct_registration_created",
        title: "Account created",
        body: "Your POSard account is active. Continue to company setup.",
        href: "/setup-company",
        relatedEntityType: "profile",
        relatedEntityId: profile.id,
      });
      await sendWelcomeEmail(email, fullName, "direct_google_registration");

      return { mode: "direct", email };
    }

    const request = await prisma.registrationRequest.create({
      data: {
        fullName,
        email,
        phone: null,
        companyName: null,
        requestedRole: "manager",
        status: "pending",
      },
    });
    await notifyAdminsOfRegistrationRequest({
      requestId: request.id,
      fullName,
      email,
      companyName: null,
    });
    await sendPendingReviewEmail(email, request.id);

    return { mode: "pending_approval" };
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

async function getRegistrationConfiguration() {
  return prisma.systemConfiguration.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: { directRegistrationEnabled: true },
  });
}

async function sendWelcomeEmail(email: string, fullName: string, flow: string) {
  const appConfig = getAppConfig();
  const template = emailTemplates.accountApproved({
    name: fullName,
    appUrl: appConfig.appUrl ? `${appConfig.appUrl}/auth/login` : undefined,
  });

  await messagingService.sendEmail({
    to: email,
    category: "auth",
    metadata: { flow },
    ...template,
  });
}

async function sendEmailConfirmation(input: {
  email: string;
  fullName: string;
  confirmationUrl: string;
}) {
  const template = emailTemplates.accountEmailConfirmation({
    name: input.fullName,
    confirmationUrl: input.confirmationUrl,
  });

  return messagingService.sendEmail({
    to: input.email,
    category: "auth",
    metadata: { flow: "email_confirmation_required" },
    ...template,
  });
}

async function sendPendingReviewEmail(email: string, requestId: string) {
  await messagingService.sendEmail({
    to: email,
    subject: "Your POSard registration is pending review",
    html: "<p>Your POSard registration request was received and is waiting for admin review.</p>",
    text: "Your POSard registration request was received and is waiting for admin review.",
    category: "registration",
    metadata: { requestId, flow: "approval_required" },
  });
}

async function notifyAdminsOfRegistrationRequest(input: {
  requestId: string;
  fullName: string;
  email: string;
  companyName: string | null;
}) {
  const admins = await prisma.profile.findMany({
    where: { role: "admin", status: "active" },
    select: { id: true, email: true },
  });

  const appConfig = getAppConfig();
  const template = emailTemplates.registrationApprovalRequested({
    name: input.fullName,
    email: input.email,
    companyName: input.companyName,
    approvalUrl: appConfig.appUrl ? `${appConfig.appUrl}/approvals` : undefined,
  });

  await Promise.all([
    notificationService.createMany(admins.map((admin) => ({
      profileId: admin.id,
      category: "REGISTRATION" as const,
      type: "manager_registration_pending",
      title: "Registration pending approval",
      body: `${input.fullName} submitted a manager registration request.`,
      href: "/approvals",
      relatedEntityType: "registration_request",
      relatedEntityId: input.requestId,
    }))),
    ...admins.map((admin) => messagingService.sendEmail({
      to: admin.email,
      category: "registration",
      metadata: {
        requestId: input.requestId,
        flow: "admin_approval_requested",
      },
      ...template,
    })),
  ]);
}
