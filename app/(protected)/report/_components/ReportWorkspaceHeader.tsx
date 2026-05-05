import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportViewMeta } from "./report-workspace-config";

export function ReportWorkspaceHeader({
  workspaceLabel,
  workspaceDescription,
  resolvedScopeBadge,
  companyName,
  selectedViewMeta,
  dateLabel,
  printControls,
}: {
  workspaceLabel: string;
  workspaceDescription: string;
  resolvedScopeBadge: string;
  companyName?: string | null;
  selectedViewMeta: ReportViewMeta;
  dateLabel: string;
  printControls: ReactNode;
}) {
  const ActiveIcon = selectedViewMeta.icon;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-background shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]"
              >
                {workspaceLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {resolvedScopeBadge}
              </Badge>
              {companyName ? (
                <Badge variant="outline" className="rounded-full">
                  {companyName}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {selectedViewMeta.label}
              </h1>
              <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                {workspaceDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 text-sm text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>{dateLabel}</span>
            </div>
            {printControls}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-primary/[0.04] p-3 sm:p-4">
          <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <ActiveIcon className="size-5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {selectedViewMeta.category}
                  </Badge>
                </div>
                <p className="text-sm leading-5 text-muted-foreground">
                  {selectedViewMeta.supportingCopy}
                </p>
              </div>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
