export interface RateLimitTier {
  windowMs: number;
  max: number;
}

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const securityConfig = {
  rateLimits: {
    login: { windowMs: 60_000, max: intEnv("SECURITY_RATE_LIMIT_LOGIN_MAX", 5) },
    signup: { windowMs: 15 * 60_000, max: intEnv("SECURITY_RATE_LIMIT_SIGNUP_MAX", 3) },
    passwordReset: {
      windowMs: 15 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_PASSWORD_RESET_MAX", 3),
    },
    resendVerification: {
      windowMs: 10 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_RESEND_MAX", 3),
    },
    aiReportChat: {
      windowMs: 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_AI_REPORT_MAX", 20),
    },
    exportReport: {
      windowMs: 5 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_EXPORT_REPORT_MAX", 10),
    },
    dataExport: {
      windowMs: 5 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_DATA_EXPORT_MAX", 6),
    },
    invoiceReprint: {
      windowMs: 10 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_INVOICE_REPRINT_MAX", 10),
    },
    publicForm: {
      windowMs: 15 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_PUBLIC_FORM_MAX", 5),
    },
    adminMutation: {
      windowMs: 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_ADMIN_MUTATION_MAX", 30),
    },
    terminalMutation: {
      windowMs: 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_TERMINAL_MUTATION_MAX", 40),
    },
    sensitivePosAction: {
      windowMs: 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_SENSITIVE_POS_MAX", 30),
    },
    managerPin: {
      windowMs: 5 * 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_MANAGER_PIN_MAX", 5),
    },
    sync: {
      windowMs: 60_000,
      max: intEnv("SECURITY_RATE_LIMIT_SYNC_MAX", 120),
    },
    search: { windowMs: 60_000, max: intEnv("SECURITY_RATE_LIMIT_SEARCH_MAX", 120) },
  },
  payload: {
    defaultJsonBytes: intEnv("SECURITY_PAYLOAD_DEFAULT_JSON_BYTES", 256_000),
    aiChatBytes: intEnv("SECURITY_PAYLOAD_AI_CHAT_BYTES", 128_000),
    authBytes: intEnv("SECURITY_PAYLOAD_AUTH_BYTES", 32_000),
    syncBytes: intEnv("SECURITY_PAYLOAD_SYNC_BYTES", 1_000_000),
  },
  pagination: {
    defaultLimit: intEnv("SECURITY_PAGINATION_DEFAULT_LIMIT", 20),
    maxLimit: intEnv("SECURITY_PAGINATION_MAX_LIMIT", 100),
  },
} as const;

export type SecurityRateLimitBucket = keyof typeof securityConfig.rateLimits;
