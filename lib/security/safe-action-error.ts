const SAFE_ERROR_PATTERNS = [
  /^Too many requests/i,
  /^Invalid /i,
  /^Manager PIN/i,
  /^No company associated/i,
  /^Amount must/i,
  /^Cash tender amount/i,
  /^Items cannot/i,
  /^Quantity must/i,
  /^Price cannot/i,
  /^Customer is required/i,
  /^Due date is required/i,
  /^Payment amount/i,
  /^Terminal is already in use/i,
  /^You already have an active POS session/i,
  /^Insufficient stock/i,
  /^Insufficient cash/i,
  /^Active POS session/i,
  /^Session is not active/i,
  /^Unable to build X-reading/i,
  /^Queued action/i,
  /^Terminal session/i,
  /^Offline .+ requires online manager approval review/i,
];

export function toSafeActionError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  return SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(error.message))
    ? error.message
    : fallback;
}
