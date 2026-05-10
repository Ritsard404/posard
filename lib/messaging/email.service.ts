import "server-only";

import { getAppConfig } from "@/lib/app-config";
import type { EmailPayload, EmailProvider, EmailResult } from "./email.types";

class NoopEmailProvider implements EmailProvider {
  readonly name = "noop";

  async send(payload: EmailPayload): Promise<EmailResult> {
    console.info("POSard email skipped", {
      provider: this.name,
      category: payload.category,
      reason: "email-disabled-or-not-configured",
    });

    return {
      status: "skipped",
      provider: this.name,
      reason: "Email provider is not enabled or configured.",
    };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: this.replyTo || undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { id?: string; message?: string; error?: unknown }
        | null;

      if (!response.ok) {
        return {
          status: "failed",
          provider: this.name,
          reason: data?.message ?? "Resend email request failed.",
        };
      }

      return { status: "sent", provider: this.name, messageId: data?.id };
    } catch (error) {
      console.error("POSard email send failed", error);
      return {
        status: "failed",
        provider: this.name,
        reason: "Email provider request failed.",
      };
    }
  }
}

function resolveProvider(): EmailProvider {
  const config = getAppConfig();

  if (
    config.email.enabled &&
    config.email.provider === "resend" &&
    config.email.resendApiKey &&
    config.email.from
  ) {
    return new ResendEmailProvider(
      config.email.resendApiKey,
      config.email.from,
      config.email.replyTo,
    );
  }

  return new NoopEmailProvider();
}

export const messagingService = {
  async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    return resolveProvider().send(payload);
  },
};
