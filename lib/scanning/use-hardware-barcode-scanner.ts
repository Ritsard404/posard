"use client";

import { useEffect, useRef } from "react";

import {
  createHardwareScannerBuffer,
  isEditableScannerTarget,
} from "./hardware-scan.service";
import type { ScanResultDto } from "./scan.dto";

interface UseHardwareBarcodeScannerOptions {
  enabled?: boolean;
  ignoreEditableTargets?: boolean;
  onScan: (result: ScanResultDto) => void;
}

export function useHardwareBarcodeScanner({
  enabled = false,
  ignoreEditableTargets = true,
  onScan,
}: UseHardwareBarcodeScannerOptions) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const buffer = createHardwareScannerBuffer({
      onScan: (result) => onScanRef.current(result),
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (ignoreEditableTargets && isEditableScannerTarget(event.target)) {
        buffer.reset();
        return;
      }

      buffer.handleKeyDown(event);
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      buffer.reset();
    };
  }, [enabled, ignoreEditableTargets]);
}
