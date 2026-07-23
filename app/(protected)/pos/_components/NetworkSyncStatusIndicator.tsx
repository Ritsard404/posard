"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { getOfflineQueueSnapshot } from "../_services/offline-sync.client";
import { Button } from "@/components/ui/button";

interface NetworkSyncStatusIndicatorProps {
  onRetry?: () => void;
}

export function NetworkSyncStatusIndicator({
  onRetry,
}: NetworkSyncStatusIndicatorProps) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [needsReview, setNeedsReview] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const queue = await getOfflineQueueSnapshot();
      if (!cancelled) {
        setOnline(navigator.onLine);
        setPending(queue.pendingCount + queue.syncingCount);
        setNeedsReview(queue.needsReviewCount);
      }
    }

    const handleOnline = () => void refresh();
    const handleOffline = () => void refresh();
    void refresh();
    const timer = window.setInterval(refresh, 2_000);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const tone = online
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${tone}`}
    >
      {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
      <span className="font-medium">{online ? "Online" : "Offline mode"}</span>
      {pending === null ? (
        <span>Checking queue</span>
      ) : pending > 0 ? (
        <span>{pending} waiting to sync</span>
      ) : (
        <span>Queue clear</span>
      )}
      {needsReview > 0 ? <span>{needsReview} need review</span> : null}
      {onRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 bg-white/70 px-2 text-xs"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
