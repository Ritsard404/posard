import "server-only";

export type EmailProviderName = "noop" | "resend" | "smtp";
export type AiProviderName = "mock" | "openai";

function boolEnv(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function providerEnv<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function getAppConfig() {
  const emailProvider = providerEnv<EmailProviderName>(
    process.env.EMAIL_PROVIDER,
    ["noop", "resend", "smtp"],
    "noop",
  );
  const aiProvider = providerEnv<AiProviderName>(
    process.env.AI_PROVIDER,
    ["mock", "openai"],
    "mock",
  );
  const emailEnabled = boolEnv(process.env.EMAIL_ENABLED, false);
  const aiReportEnabled = boolEnv(process.env.AI_REPORT_ENABLED, true);
  const useAiMockWhenMissingKey = boolEnv(
    process.env.AI_REPORT_USE_MOCK_WHEN_MISSING_KEY,
    true,
  );

  const warnings: string[] = [];

  if (emailEnabled && emailProvider === "resend" && !process.env.RESEND_API_KEY) {
    warnings.push("Email provider is resend but RESEND_API_KEY is missing.");
  }

  if (emailEnabled && emailProvider === "smtp") {
    if (!process.env.SMTP_HOST) {
      warnings.push("Email provider is smtp but SMTP_HOST is missing.");
    }

    if (!process.env.SMTP_USER) {
      warnings.push("Email provider is smtp but SMTP_USER is missing.");
    }

    if (!process.env.SMTP_PASSWORD) {
      warnings.push("Email provider is smtp but SMTP_PASSWORD is missing.");
    }
  }

  if (emailEnabled && !process.env.EMAIL_FROM) {
    warnings.push("EMAIL_ENABLED is true but EMAIL_FROM is missing.");
  }

  if (aiReportEnabled && aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
    warnings.push("AI provider is openai but OPENAI_API_KEY is missing.");
  }

  return {
    appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
    email: {
      enabled: emailEnabled,
      provider: emailProvider,
      from: process.env.EMAIL_FROM || "",
      replyTo: process.env.EMAIL_REPLY_TO || "",
      resendApiKey: process.env.RESEND_API_KEY || "",
      smtpHost: process.env.SMTP_HOST || "",
      smtpPort: Number(process.env.SMTP_PORT || 587),
      smtpSecure: boolEnv(process.env.SMTP_SECURE, false),
      smtpUser: process.env.SMTP_USER || "",
      smtpPassword: process.env.SMTP_PASSWORD || "",
      ready:
        emailEnabled &&
        Boolean(process.env.EMAIL_FROM) &&
        ((emailProvider === "resend" && Boolean(process.env.RESEND_API_KEY)) ||
          (emailProvider === "smtp" &&
            Boolean(process.env.SMTP_HOST) &&
            Boolean(process.env.SMTP_USER) &&
            Boolean(process.env.SMTP_PASSWORD))),
    },
    aiReport: {
      enabled: aiReportEnabled,
      provider: aiProvider,
      openAiApiKey: process.env.OPENAI_API_KEY || "",
      useMockWhenMissingKey: useAiMockWhenMissingKey,
      ready:
        aiReportEnabled &&
        aiProvider === "openai" &&
        Boolean(process.env.OPENAI_API_KEY),
    },
    warnings,
  };
}
