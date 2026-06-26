import { DataExchangeClient } from "./_components/DataExchangeClient";

export default function DataExchangePage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-background p-4">
        <h1 className="text-xl font-bold tracking-tight">Data Exchange</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Export backup data, download product catalog files, and validate restore files with a dry-run duplicate preview before importing.
        </p>
      </div>
      <DataExchangeClient />
    </div>
  );
}
