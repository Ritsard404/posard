export const REPORT_TIME_ZONE = "Asia/Manila";

export function formatReportDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function formatReportDateTime(value: Date, options?: { seconds?: boolean }) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(options?.seconds ? { second: "2-digit" } : {}),
  }).format(value);
}

export function formatReportTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatReportDateInput(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatReportExportDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatReportExportDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
