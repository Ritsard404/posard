"use server";

import { z } from "zod";
import { getAppConfig } from "@/lib/app-config";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { messagingService } from "@/lib/messaging/email.service";

const supportFeedbackSchema = z.object({
  message: z.string().trim().min(10).max(3000),
  pageUrl: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  deviceInfo: z.string().trim().max(500).optional(),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLine(label: string, value: string | null | undefined) {
  return `${label}: ${value?.trim() || "Not provided"}`;
}

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
    const subject = `POSard feedback from ${reporterName}`;
    const details = [
      formatLine("Reporter", reporterName),
      formatLine("Login email", profile.email),
      formatLine("Reply contact", reporterEmail),
      formatLine("Role", profile.role),
      formatLine("Company ID", profile.companyId),
      formatLine("Branch ID", profile.branchId),
      formatLine("Page", parsed.pageUrl),
      formatLine("Device", parsed.deviceInfo),
      "",
      "Message:",
      parsed.message,
    ].join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <h1 style="font-size:20px;">${escapeHtml(subject)}</h1>
        <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(details)}</pre>
        <p style="font-size:12px;color:#6b7280;">Sent from POSard Help Center</p>
      </div>
    `;

    const result = await messagingService.sendEmail({
      to: supportEmail,
      subject,
      html,
      text: details,
      category: "system",
      metadata: {
        source: "help-center-feedback",
        profileId: profile.id,
        companyId: profile.companyId,
      },
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
