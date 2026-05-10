export type EmailCategory =
  | "auth"
  | "registration"
  | "terminal-request"
  | "subscription"
  | "report"
  | "system";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface EmailResult {
  status: "sent" | "skipped" | "failed";
  provider: string;
  reason?: string;
  messageId?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(payload: EmailPayload): Promise<EmailResult>;
}
