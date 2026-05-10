interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseTemplate(title: string, body: string, action?: { label: string; href: string }): TemplateResult {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const actionHtml = action
    ? `<p><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#155dfc;color:#ffffff;text-decoration:none;">${escapeHtml(action.label)}</a></p>`
    : "";

  return {
    subject: title,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;"><h1 style="font-size:20px;">${safeTitle}</h1><p>${safeBody}</p>${actionHtml}<p style="font-size:12px;color:#6b7280;">POSard Business Suite</p></div>`,
    text: action ? `${title}\n\n${body}\n\n${action.label}: ${action.href}` : `${title}\n\n${body}`,
  };
}

export const emailTemplates = {
  accountApproved(input: { name: string; appUrl?: string }) {
    return baseTemplate(
      "Your POSard account is approved",
      `Hi ${input.name}, your POSard account is ready. You can sign in and continue setup.`,
      input.appUrl ? { label: "Open POSard", href: input.appUrl } : undefined,
    );
  },
  managerApprovalResult(input: { approved: boolean; reason?: string | null }) {
    return baseTemplate(
      input.approved ? "Registration approved" : "Registration rejected",
      input.approved
        ? "Your registration request was approved."
        : `Your registration request was rejected.${input.reason ? ` Reason: ${input.reason}` : ""}`,
    );
  },
  terminalRequestResult(input: { approved: boolean; count: number; appUrl?: string }) {
    return baseTemplate(
      input.approved ? "Terminal request approved" : "Terminal request updated",
      `${input.count} requested terminal${input.count === 1 ? "" : "s"} ${input.approved ? "were approved" : "were updated"}.`,
      input.appUrl ? { label: "View terminals", href: input.appUrl } : undefined,
    );
  },
  passwordHelpPlaceholder() {
    return baseTemplate(
      "Password help is ready for email setup",
      "POSard password help email content is configured and will be sent once an email provider is enabled.",
    );
  },
  subscriptionReminderPlaceholder() {
    return baseTemplate(
      "Subscription reminder",
      "POSard subscription reminder email content is configured and ready for provider delivery.",
    );
  },
  reportExportReady(input: { reportName: string; appUrl?: string }) {
    return baseTemplate(
      "Report export ready",
      `${input.reportName} is ready to review in POSard.`,
      input.appUrl ? { label: "Open report", href: input.appUrl } : undefined,
    );
  },
};
