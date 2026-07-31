import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseCustomReportDateRange } from "../../lib/report-date-range";

describe("report custom date ranges", () => {
  test("normalizes both boundaries to the complete local days", () => {
    const range = parseCustomReportDateRange("2026-07-01", "2026-07-31");
    assert.ok(range);
    assert.equal(range.from.getHours(), 0);
    assert.equal(range.from.getMinutes(), 0);
    assert.equal(range.to.getHours(), 23);
    assert.equal(range.to.getMinutes(), 59);
    assert.equal(range.to.getSeconds(), 59);
    assert.equal(range.to.getMilliseconds(), 999);
  });

  test("rejects incomplete or invalid ranges so the service can use its safe fallback", () => {
    assert.equal(parseCustomReportDateRange(undefined, "2026-07-31"), null);
    assert.equal(parseCustomReportDateRange("not-a-date", "2026-07-31"), null);
    assert.equal(parseCustomReportDateRange("2026-07-01", "not-a-date"), null);
    assert.equal(parseCustomReportDateRange("2026-02-31", "2026-03-01"), null);
    assert.equal(parseCustomReportDateRange("2026-07-02", "2026-07-01"), null);
  });

  test("anchors input dates to the report timezone instead of the server timezone", () => {
    const range = parseCustomReportDateRange("2026-07-01", "2026-07-01");
    assert.ok(range);
    assert.equal(range.from.toISOString(), "2026-06-30T16:00:00.000Z");
    assert.equal(range.to.toISOString(), "2026-07-01T15:59:59.999Z");
  });
});
