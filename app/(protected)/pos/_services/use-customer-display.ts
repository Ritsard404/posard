"use client";

import { useEffect, useState, useTransition } from "react";
import { getCustomerDisplaySnapshotAction } from "../_actions/customer-display.action";
import type { CustomerDisplayDTO } from "./_dto/customer-display.dto";
import { subscribeToCustomerDisplay } from "./customer-display-realtime.service";

export function useCustomerDisplay(
  terminalId: string,
  initialDisplay: CustomerDisplayDTO,
) {
  const [display, setDisplay] = useState(initialDisplay);
  const [isPending, startTransition] = useTransition();
  const [connectionState, setConnectionState] = useState<
    "connecting" | "live" | "stale"
  >("connecting");

  useEffect(() => {
    setDisplay(initialDisplay);
  }, [initialDisplay]);

  useEffect(() => {
    let cancelled = false;

    function refreshSnapshot() {
      startTransition(() => {
        void getCustomerDisplaySnapshotAction(terminalId).then((result) => {
          if (!cancelled && result.success) {
            setDisplay(result.display);
          }
        });
      });
    }

    refreshSnapshot();
    const unsubscribe = subscribeToCustomerDisplay(
      terminalId,
      (nextDisplay) => {
        setDisplay(nextDisplay);
        setConnectionState("live");
      },
      () => {
        setConnectionState("stale");
        refreshSnapshot();
      },
      () => setConnectionState("live"),
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [terminalId]);

  return {
    display,
    connectionState,
    isRefreshing: isPending,
  };
}
