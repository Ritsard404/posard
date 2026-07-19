import "server-only";

import nodemailer from "nodemailer";
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
      const flow = payload.metadata?.flow;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(payload.idempotencyKey
            ? { "Idempotency-Key": payload.idempotencyKey }
            : {}),
        },
        body: JSON.stringify({
          from: this.from,
          to: Array.isArray(payload.to) ? payload.to : [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo || this.replyTo || undefined,
          tags: [
            { name: "category", value: payload.category },
            ...(typeof flow === "string"
              ? [{ name: "flow", value: flow.slice(0, 256) }]
              : []),
          ],
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

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";

  constructor(
    private readonly options: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: string;
      replyTo?: string;
    },
  ) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const transport = nodemailer.createTransport({
        host: this.options.host,
        port: this.options.port,
        secure: this.options.secure,
        auth: {
          user: this.options.user,
          pass: this.options.password,
        },
      });

      const info = await transport.sendMail({
        from: this.options.from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo || this.options.replyTo || undefined,
        headers: {
          "X-POSard-Category": payload.category,
        },
      });

      return { status: "sent", provider: this.name, messageId: info.messageId };
    } catch (error) {
      console.error("POSard SMTP email send failed", error);
      return {
        status: "failed",
        provider: this.name,
        reason: "SMTP email provider request failed.",
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

  if (
    config.email.enabled &&
    config.email.provider === "smtp" &&
    config.email.smtpHost &&
    config.email.smtpUser &&
    config.email.smtpPassword &&
    config.email.from
  ) {
    return new SmtpEmailProvider({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      user: config.email.smtpUser,
      password: config.email.smtpPassword,
      from: config.email.from,
      replyTo: config.email.replyTo,
    });
  }

  return new NoopEmailProvider();
}

export const messagingService = {
  async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    return resolveProvider().send(payload);
  },
};
