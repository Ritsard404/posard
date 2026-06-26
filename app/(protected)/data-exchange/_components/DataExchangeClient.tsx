"use client";

import { useState, useTransition } from "react";
import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { previewRestoreAction } from "../_actions/data-exchange.actions";

type PreviewResult = Awaited<ReturnType<typeof previewRestoreAction>>;

export function DataExchangeClient() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = () => {
    startTransition(async () => {
      setResult(await previewRestoreAction(payload));
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Button asChild variant="outline" className="h-12 justify-start rounded-xl">
          <a href="/data-exchange/backup/export">
            <FileJson className="size-4" />
            Backup JSON
          </a>
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start rounded-xl">
          <a href="/data-exchange/product-catalog/export?format=xlsx">
            <FileSpreadsheet className="size-4" />
            Product XLSX
          </a>
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start rounded-xl">
          <a href="/data-exchange/product-catalog/export?format=pdf">
            <Download className="size-4" />
            Product PDF
          </a>
        </Button>
      </div>

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
