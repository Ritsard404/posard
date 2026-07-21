"use client";

import { useEffect, useState, useTransition } from "react";
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
        void fetch(
          `/api/pos/customer-display/${encodeURIComponent(terminalId)}`,
          {
            cache: "no-store",
          },
        )
          .then(async (response) => {
            if (!response.ok) {
              throw new Error("Unable to refresh customer display");
            }
            return (await response.json()) as CustomerDisplayDTO;
          })
          .then((nextDisplay) => {
            if (!cancelled) {
              setDisplay(nextDisplay);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setConnectionState("stale");
            }
          });
      });
    }

    refreshSnapshot();
    const refreshInterval = window.setInterval(refreshSnapshot, 2_000);
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
      window.clearInterval(refreshInterval);
      unsubscribe();
    };
  }, [terminalId]);

  return {
    display,
    connectionState,
    isRefreshing: isPending,
  };
}
