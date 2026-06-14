"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <section className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-600" />
        <h2 className="text-lg font-semibold">Dashboard could not refresh</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep using POSard and retry the dashboard in a moment.
        </p>
        <Button type="button" className="mt-4 gap-2" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </section>
    </main>
  );
}
