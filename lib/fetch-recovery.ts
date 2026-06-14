"use client";

export type FetchErrorCategory =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "VALIDATION_ERROR"
  | "CONFLICT_ERROR"
  | "OFFLINE_QUEUE_ERROR"
  | "INVOICE_POOL_ERROR"
  | "UNKNOWN_ERROR";

export interface FetchRecoveryError {
  category: FetchErrorCategory;
  safeMessage: string;
  retryable: boolean;
  status?: number;
}

export class FetchRecoveryException extends Error {
  readonly category: FetchErrorCategory;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(error: FetchRecoveryError) {
    super(error.safeMessage);
    this.name = "FetchRecoveryException";
    this.category = error.category;
    this.retryable = error.retryable;
    this.status = error.status;
  }
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const SAFE_READ_METHODS = new Set(["GET", "HEAD"]);

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number) {
  return Math.min(8_000, 500 * 2 ** attempt);
}

function classifyStatus(status: number): FetchRecoveryError {
  if (status === 401) {
    return {
      category: "AUTH_ERROR",
      safeMessage: "Please sign in again.",
      retryable: false,
      status,
    };
  }

  if (status === 403) {
    return {
      category: "PERMISSION_ERROR",
      safeMessage: "You do not have permission to perform this action.",
      retryable: false,
      status,
    };
  }

  if ([400, 404, 409, 422].includes(status)) {
    return {
      category: status === 409 ? "CONFLICT_ERROR" : "VALIDATION_ERROR",
      safeMessage: "Please review the information and try again.",
      retryable: false,
      status,
    };
  }

  if (status >= 500) {
    return {
      category: "SERVER_ERROR",
      safeMessage: "The server is temporarily unavailable. Please try again.",
      retryable: RETRYABLE_STATUSES.has(status),
      status,
    };
  }

  return {
    category: "UNKNOWN_ERROR",
    safeMessage: "Unable to complete the request. Please try again.",
    retryable: false,
    status,
  };
}

function classifyFetchFailure(error: unknown): FetchRecoveryError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      category: "TIMEOUT",
      safeMessage:
        "The connection timed out. Your work is still saved locally.",
      retryable: true,
    };
  }

  if (error instanceof TypeError) {
    return {
      category: "NETWORK_ERROR",
      safeMessage:
        "Connection problem. Your work is saved and will sync later.",
      retryable: true,
    };
  }

  if (error instanceof FetchRecoveryException) {
    return {
      category: error.category,
      safeMessage: error.message,
      retryable: error.retryable,
      status: error.status,
    };
  }

  return {
    category: "UNKNOWN_ERROR",
    safeMessage: "Unable to complete the request. Please try again.",
    retryable: false,
  };
}

export function toFetchRecoveryError(error: unknown): FetchRecoveryError {
  return classifyFetchFailure(error);
}

export async function fetchJsonWithRecovery<T>(
  input: RequestInfo | URL,
  init: RequestInit & {
    retries?: number;
    timeoutMs?: number;
    retryUnsafeRequest?: boolean;
  } = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const retries = init.retries ?? (SAFE_READ_METHODS.has(method) ? 2 : 0);
  const timeoutMs = init.timeoutMs ?? 10_000;
  const canRetryMethod =
    init.retryUnsafeRequest || SAFE_READ_METHODS.has(method);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new FetchRecoveryException(classifyStatus(response.status));
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new FetchRecoveryException({
          category: "UNKNOWN_ERROR",
          safeMessage:
            "The server response could not be read. Please try again.",
          retryable: false,
          status: response.status,
        });
      }
    } catch (error) {
      const classified = classifyFetchFailure(error);
      if (!classified.retryable || !canRetryMethod || attempt >= retries) {
        throw new FetchRecoveryException(classified);
      }

      await sleep(retryDelayMs(attempt));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new FetchRecoveryException({
    category: "UNKNOWN_ERROR",
    safeMessage: "Unable to complete the request. Please try again.",
    retryable: false,
  });
}
