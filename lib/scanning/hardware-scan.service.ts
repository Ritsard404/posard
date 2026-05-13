import type { ScanResultDto } from "./scan.dto";

export interface HardwareScannerBufferOptions {
  maxInterKeyDelayMs?: number;
  minLength?: number;
  submitKeys?: string[];
  onScan: (result: ScanResultDto) => void;
}

export interface HardwareScannerBuffer {
  handleKeyDown: (event: KeyboardEvent) => void;
  reset: () => void;
}

const defaultSubmitKeys = ["Enter", "Tab"];

export function isEditableScannerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function createHardwareScannerBuffer(
  options: HardwareScannerBufferOptions,
): HardwareScannerBuffer {
  const maxInterKeyDelayMs = options.maxInterKeyDelayMs ?? 45;
  const minLength = options.minLength ?? 4;
  const submitKeys = options.submitKeys ?? defaultSubmitKeys;
  let buffer = "";
  let lastKeyAt = 0;

  function reset() {
    buffer = "";
    lastKeyAt = 0;
  }

  function flush() {
    const value = buffer.trim();
    reset();

    if (value.length >= minLength) {
      options.onScan({ value, kind: "barcode", source: "hardware_keyboard" });
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) {
      reset();
      return;
    }

    const now = Date.now();
    const isRapidInput = lastKeyAt === 0 || now - lastKeyAt <= maxInterKeyDelayMs;

    if (!isRapidInput) {
      reset();
    }

    lastKeyAt = now;

    if (submitKeys.includes(event.key)) {
      flush();
      return;
    }

    if (event.key.length === 1) {
      buffer += event.key;
    }
  }

  return { handleKeyDown, reset };
}
