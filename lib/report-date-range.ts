export type ReportDateRange = {
  from: Date;
  to: Date;
};

const REPORT_TIME_ZONE_OFFSET = "+08:00";

function parseReportDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const start = new Date(`${value}T00:00:00${REPORT_TIME_ZONE_OFFSET}`);
  if (Number.isNaN(start.getTime())) return null;

  // Date parsing normalizes impossible dates (for example, February 31st),
  // so compare the formatted calendar portion before accepting the input.
  const normalized = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);
  return normalized === value ? start : null;
}

export function parseCustomReportDateRange(
  from: string | null | undefined,
  toInput: string | null | undefined,
): ReportDateRange | null {
  if (!from || !toInput) return null;

  const fromDate = parseReportDateInput(from);
  const toDate = parseReportDateInput(toInput);
  if (!fromDate || !toDate || fromDate > toDate) return null;

  const to = new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from: fromDate, to };
}
