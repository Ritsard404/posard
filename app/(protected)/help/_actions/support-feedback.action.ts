"use server";

import { z } from "zod";
import { getAppConfig } from "@/lib/app-config";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { messagingService } from "@/lib/messaging/email.service";
import { emailTemplates } from "@/lib/messaging/email-templates";

const feedbackTopics = ["Bug or error", "Feature request", "Account help", "Billing or subscription", "Other"] as const;
const feedbackPriorities = ["Normal", "High", "Urgent"] as const;

const supportFeedbackSchema = z.object({
  message: z.string().trim().min(10).max(3000),
  topic: z.enum(feedbackTopics),
  priority: z.enum(feedbackPriorities),
  pageUrl: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  deviceInfo: z.string().trim().max(500).optional(),
});

export async function sendSupportFeedbackAction(input: unknown) {
  try {
    const config = getAppConfig();
    const supportEmail = config.email.replyTo || config.email.from;

    if (!config.email.ready || !supportEmail) {
      return {
        success: false,
        error: "Support email is not ready yet. Ask an admin to check email settings.",
      } as const;
    }

    const [profile, parsed] = await Promise.all([
      getCurrentProfile(),
      Promise.resolve(supportFeedbackSchema.parse(input)),
    ]);

    if (!profile) {
      return {
        success: false,
        error: "Sign in before sending feedback.",
      } as const;
    }

    const reporterName = profile.fullName || profile.email || "POSard user";
    const reporterEmail = parsed.contactEmail || profile.email || "";
    const template = emailTemplates.supportFeedback({
      reporterName,
      topic: parsed.topic,
      priority: parsed.priority,
      message: parsed.message,
      details: [
        { label: "Reporter", value: reporterName },
        { label: "Login email", value: profile.email || "Not provided" },
        { label: "Reply contact", value: reporterEmail || "Not provided" },
        { label: "Role", value: profile.role },
        { label: "Company ID", value: profile.companyId || "Not provided" },
        { label: "Branch ID", value: profile.branchId || "Not provided" },
        { label: "Page", value: parsed.pageUrl || "Not provided" },
        { label: "Device", value: parsed.deviceInfo || "Not provided" },
      ],
    });

    const result = await messagingService.sendEmail({
      to: supportEmail,
      replyTo: reporterEmail || undefined,
      category: "system",
      metadata: {
        source: "help-center-feedback",
        flow: "support_feedback",
        profileId: profile.id,
        companyId: profile.companyId,
      },
      ...template,
    });

    if (result.status !== "sent") {
      return {
        success: false,
        error: "Feedback could not be sent. Please try again.",
      } as const;
    }

    return { success: true } as const;
  } catch (error) {
    console.error("Support feedback failed", error);

    return {
      success: false,
      error: "Feedback could not be sent. Please check the message and try again.",
    } as const;
  }
}
