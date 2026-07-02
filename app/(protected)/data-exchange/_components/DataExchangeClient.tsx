"use client";

import { useState, useTransition } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { previewRestoreAction } from "../_actions/data-exchange.actions";

type PreviewResult = Awaited<ReturnType<typeof previewRestoreAction>>;

export function DataExchangeClient({
  exportHistory,
}: {
  exportHistory: Array<{
    id: string;
    actionType: string;
    actorName: string;
    exportType: string;
    format: string;
    rowCount: number;
    fileSize: number | null;
    createdAt: string;
  }>;
}) {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = () => {
    startTransition(async () => {
      setResult(await previewRestoreAction(payload));
    });
  };

  async function downloadBackup() {
    setBackupStatus("Preparing backup...");
    try {
      const response = await fetch("/data-exchange/backup/export", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Unable to download backup right now.");
      }

      setBackupStatus("Downloading backup...");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `posard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setBackupStatus("Backup downloaded.");
    } catch (error) {
      setBackupStatus(
        error instanceof Error ? error.message : "Unable to download backup.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          className="h-12 justify-start rounded-xl"
          onClick={downloadBackup}
          disabled={backupStatus === "Preparing backup..." || backupStatus === "Downloading backup..."}
        >
          {backupStatus === "Preparing backup..." || backupStatus === "Downloading backup..." ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileJson className="size-4" />
          )}
          Backup JSON
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start rounded-xl">
          <a href="/data-exchange/product-catalog/export?format=xls">
            <FileSpreadsheet className="size-4" />
            Product Excel
          </a>
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start rounded-xl">
          <a href="/data-exchange/product-catalog/export?format=pdf">
            <Download className="size-4" />
            Product PDF
          </a>
        </Button>
      </div>
      {backupStatus ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {backupStatus}
        </div>
      ) : null}

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Recent Export History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exportHistory.length > 0 ? (
            exportHistory.map((item) => (
              <div
                key={item.id}
                className="grid gap-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm md:grid-cols-[1.3fr_1fr_0.8fr_0.8fr]"
              >
                <div>
                  <div className="font-semibold">{item.exportType}</div>
                  <div className="text-xs text-muted-foreground">{item.actionType}</div>
                </div>
                <div className="text-muted-foreground">{item.actorName}</div>
                <div>{item.rowCount.toLocaleString()} rows</div>
                <div className="text-muted-foreground">
                  {item.format.toUpperCase()} / {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              No exports recorded yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Restore Dry-Run Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (loadEvent) => {
                setPayload(String(loadEvent.target?.result ?? ""));
                setResult(null);
              };
              reader.readAsText(file);
            }}
          />
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            className="min-h-40 w-full rounded-lg border bg-background p-3 font-mono text-xs"
            placeholder="Paste backup JSON here for dry-run validation."
          />
          <Button type="button" onClick={preview} disabled={isPending || !payload.trim()} className="rounded-xl">
            <Upload className="size-4" />
            Preview Restore
          </Button>
          {result ? (
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
