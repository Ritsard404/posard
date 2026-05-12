import "server-only";

export type AbuseLogInput = {
  action: string;
  route: string;
  result: "blocked" | "allowed" | "failed";
  reasonCode: string;
  userId?: string | null;
  role?: string | null;
  companyId?: string | null;
  terminalId?: string | null;
  ipHash?: string | null;
  correlationId?: string | null;
};

export async function logAbuseEvent(input: AbuseLogInput): Promise<void> {
  console.warn("POSard security event", {
    timestamp: new Date().toISOString(),
    ...input,
  });
}
