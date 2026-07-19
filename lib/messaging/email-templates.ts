interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

interface TemplateAction {
  label: string;
  href: string;
}

interface TemplateDetail {
  label: string;
  value: string;
}

interface BaseTemplateInput {
  title: string;
  preview: string;
  greeting?: string;
  paragraphs: string[];
  action?: TemplateAction;
  details?: TemplateDetail[];
  notice?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseTemplate(input: BaseTemplateInput): TemplateResult {
  const safeTitle = escapeHtml(input.title);
  const bodyHtml = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const detailsHtml = input.details?.length
    ? `<table role="presentation" style="width:100%;margin:8px 0 20px;border-collapse:collapse;background:#f8fafc;border-radius:8px;">${input.details
        .map(
          (detail) =>
            `<tr><td style="padding:8px 12px;color:#64748b;font-size:13px;vertical-align:top;width:34%;">${escapeHtml(detail.label)}</td><td style="padding:8px 12px;color:#0f172a;font-size:13px;font-weight:600;overflow-wrap:anywhere;">${escapeHtml(detail.value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const actionHtml = input.action
    ? `<div style="margin:24px 0;"><a href="${escapeHtml(input.action.href)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#155dfc;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(input.action.label)}</a><p style="margin:12px 0 0;color:#64748b;font-size:12px;">If the button does not open, copy this link:<br><a href="${escapeHtml(input.action.href)}" style="color:#155dfc;overflow-wrap:anywhere;">${escapeHtml(input.action.href)}</a></p></div>`
    : "";
  const noticeHtml = input.notice
    ? `<div style="margin-top:20px;padding:12px;border-left:4px solid #f59e0b;background:#fffbeb;color:#78350f;font-size:13px;">${escapeHtml(input.notice)}</div>`
    : "";
  const greetingHtml = input.greeting
    ? `<p style="margin:0 0 16px;font-weight:600;">${escapeHtml(input.greeting)}</p>`
    : "";

  const textParts = [
    input.title,
    input.greeting,
    ...input.paragraphs,
    ...(input.details?.map((detail) => `${detail.label}: ${detail.value}`) ?? []),
    input.action
      ? `${input.action.label}: ${input.action.href}`
      : undefined,
    input.notice ? `Important: ${input.notice}` : undefined,
    "POSard Business Suite",
  ].filter((part): part is string => Boolean(part));

  return {
    subject: input.title,
    html: `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preview)}</div><table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center"><table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background:#ffffff;border-radius:12px;"><tr><td style="padding:28px;"><p style="margin:0 0 8px;color:#155dfc;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">POSard Business Suite</p><h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#0f172a;">${safeTitle}</h1>${greetingHtml}${bodyHtml}${detailsHtml}${actionHtml}${noticeHtml}<hr style="margin:24px 0 16px;border:0;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">This is an automated POSard message. Reply only when the message invites you to contact support.</p></td></tr></table></td></tr></table></body></html>`,
    text: textParts.join("\n\n"),
  };
}

export const emailTemplates = {
  accountEmailConfirmation(input: { name: string; confirmationUrl: string }) {
    return baseTemplate({
      title: "Confirm your POSard email",
      preview: "Confirm your email to activate your POSard sign-in.",
      greeting: `Hi ${input.name},`,
      paragraphs: [
        "Your account request was received. Confirm this email address to activate your POSard sign-in.",
        "No administrator approval is required for this registration.",
      ],
      action: { label: "Confirm email", href: input.confirmationUrl },
      notice: "For your security, do not forward this confirmation link. If you did not create this account, you can ignore this email.",
    });
  },
  registrationApprovalRequested(input: {
    name: string;
    email: string;
    companyName?: string | null;
    approvalUrl?: string;
  }) {
    const company = input.companyName ? ` for ${input.companyName}` : "";

    return baseTemplate({
      title: "New POSard registration needs approval",
      preview: `${input.name} is waiting for an access decision.`,
      paragraphs: ["A new manager registration request is ready for review."],
      details: [
        { label: "Applicant", value: input.name },
        { label: "Email", value: input.email },
        { label: "Company", value: input.companyName || "Not provided" },
      ],
      action: input.approvalUrl
        ? { label: "Review registration", href: input.approvalUrl }
        : undefined,
      notice: `Approve access only after confirming the applicant${company}.`,
    });
  },
  accountApproved(input: { name: string; appUrl?: string }) {
    return baseTemplate({
      title: "Your POSard account is ready",
      preview: "Sign in to POSard and continue your store setup.",
      greeting: `Hi ${input.name},`,
      paragraphs: ["Your POSard account is active. You can now sign in and continue your store setup."],
      action: input.appUrl ? { label: "Open POSard", href: input.appUrl } : undefined,
      notice: "POSard will never ask you to send your password or manager PIN by email.",
    });
  },
  accountPasswordSetup(input: { name: string; setupUrl: string }) {
    return baseTemplate({
      title: "Your POSard account is approved",
      preview: "Create your private password to finish account setup.",
      greeting: `Hi ${input.name},`,
      paragraphs: ["An administrator approved your registration. Create your private password to finish setting up your account."],
      action: { label: "Set my password", href: input.setupUrl },
      notice: "This link is private. Do not forward it. POSard will never send or request your password by email.",
    });
  },
  registrationPendingReview(input: { name: string }) {
    return baseTemplate({
      title: "Your POSard registration is under review",
      preview: "An administrator will review your registration request.",
      greeting: `Hi ${input.name},`,
      paragraphs: [
        "We received your registration request and sent it to a POSard administrator for review.",
        "You will receive another email after a decision is made. You do not need to submit the form again.",
      ],
    });
  },
  managerApprovalResult(input: { name: string; approved: boolean; reason?: string | null }) {
    return baseTemplate({
      title: input.approved ? "Registration approved" : "Registration not approved",
      preview: input.approved
        ? "Your POSard registration was approved."
        : "An administrator reviewed your POSard registration.",
      greeting: `Hi ${input.name},`,
      paragraphs: [
        input.approved
          ? "Your registration request was approved."
          : "Your registration request was not approved at this time.",
      ],
      details: !input.approved && input.reason
        ? [{ label: "Administrator note", value: input.reason }]
        : undefined,
      notice: !input.approved
        ? "If you believe this decision was made in error, contact your POSard administrator before submitting another request."
        : undefined,
    });
  },
  terminalRequestResult(input: { approved: boolean; count: number; appUrl?: string }) {
    const terminalLabel = `${input.count} terminal${input.count === 1 ? "" : "s"}`;
    return baseTemplate({
      title: input.approved ? "Terminal request approved" : "Terminal request updated",
      preview: `${terminalLabel} ${input.approved ? "approved" : "updated"}.`,
      paragraphs: [`Your request for ${terminalLabel} was ${input.approved ? "approved" : "updated"}.`],
      action: input.appUrl ? { label: "View terminals", href: input.appUrl } : undefined,
    });
  },
  passwordHelpPlaceholder() {
    return baseTemplate({
      title: "Password help is ready for email setup",
      preview: "POSard password email delivery needs provider setup.",
      paragraphs: ["POSard password help email content is configured and will be sent once an email provider is enabled."],
    });
  },
  subscriptionReminderPlaceholder() {
    return baseTemplate({
      title: "Subscription reminder",
      preview: "Review your POSard subscription information.",
      paragraphs: ["POSard subscription reminder email content is configured and ready for provider delivery."],
    });
  },
  reportExportReady(input: { reportName: string; appUrl?: string }) {
    return baseTemplate({
      title: "Report export ready",
      preview: `${input.reportName} is ready to review.`,
      paragraphs: [`${input.reportName} is ready to review in POSard.`],
      action: input.appUrl ? { label: "Open report", href: input.appUrl } : undefined,
    });
  },
  supportFeedback(input: {
    reporterName: string;
    topic: string;
    priority: string;
    details: TemplateDetail[];
    message: string;
  }) {
    return baseTemplate({
      title: `[${input.priority}] ${input.topic} from ${input.reporterName}`,
      preview: `${input.reporterName} sent a ${input.topic.toLowerCase()} report from POSard.`,
      paragraphs: [input.message],
      details: input.details,
      notice: "Reply to this email to contact the reporter when a reply address was provided.",
    });
  },
};
