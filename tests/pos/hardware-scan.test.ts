import assert from "node:assert/strict";
import test from "node:test";

import { createHardwareScannerBuffer } from "@/lib/scanning/hardware-scan.service";

test("hardware scanner buffer emits rapid input on submit key", () => {
  const scans: string[] = [];
  let now = 1_000;
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    const buffer = createHardwareScannerBuffer({
      onScan: (result) => scans.push(result.value),
    });

    for (const key of "4901234567894") {
      buffer.handleKeyDown({ key } as KeyboardEvent);
      now += 12;
    }

    buffer.handleKeyDown({ key: "Enter" } as KeyboardEvent);

    assert.deepEqual(scans, ["4901234567894"]);
  } finally {
    Date.now = originalNow;
  }
});

test("hardware scanner buffer ignores slow manual typing", () => {
  const scans: string[] = [];
  let now = 1_000;
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    const buffer = createHardwareScannerBuffer({
      onScan: (result) => scans.push(result.value),
    });

    for (const key of "12345") {
      buffer.handleKeyDown({ key } as KeyboardEvent);
      now += 150;
    }

    buffer.handleKeyDown({ key: "Enter" } as KeyboardEvent);

    assert.deepEqual(scans, []);
  } finally {
    Date.now = originalNow;
  }
});
