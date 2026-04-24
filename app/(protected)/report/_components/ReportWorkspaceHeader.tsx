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
    <Card className="overflow-hidden rounded-[30px] border-border/70 bg-background shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 uppercase tracking-[0.16em]"
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

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {workspaceLabel}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {workspaceDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>{dateLabel}</span>
            </div>
            {printControls}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[26px] border border-border/70 bg-primary/[0.04] p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <ActiveIcon className="size-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    Active report
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {selectedViewMeta.category}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-semibold tracking-tight">
                    {selectedViewMeta.label}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedViewMeta.description}
                  </p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {selectedViewMeta.supportingCopy}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-border/70 bg-muted/10 p-4 sm:p-5">
            <div className="space-y-2">
              <div className="text-sm font-semibold tracking-tight">
                Report navigation
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Reports are grouped by task so the workspace stays easy to scan on
                both mobile and desktop.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

