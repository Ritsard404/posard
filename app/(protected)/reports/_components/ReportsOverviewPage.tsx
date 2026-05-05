import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/app/(protected)/report/_components/ReportListPrimitives";
import { AdminReportsIndexClient } from "@/app/(protected)/report/_components/AdminReportsIndexClient";
import { ReportFilterToolbar } from "./ReportFilterToolbar";
import { OverviewSummaryCards } from "./ReportSummaryCards";
import type { reportPageService } from "../_services/report-page.service";

type OverviewData = Awaited<ReturnType<typeof reportPageService.loadOverview>>;

export function ReportsOverviewPage({ data }: { data: OverviewData }) {
  if (data.mode === "empty") {
    return (
      <EmptyState
        title="Reports unavailable"
        message="Reports are not available until your account is assigned to a company."
      />
    );
  }

  if (data.mode === "admin") {
    return <AdminReportsIndexClient pageData={data.companies} />;
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Reports
              </span>
              <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                {data.todayLabel}
              </span>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Reports
              </h1>
              <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                Open a report and see the data immediately. This overview keeps the
                main totals visible while giving you direct routes into each report page.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            {data.range.label}
          </div>
        </div>
      </div>

      <OverviewSummaryCards overview={data.overview} />

      <ReportFilterToolbar
        basePath="/reports"
        preset={data.range.preset}
        fromInput={data.range.fromInput}
        toInput={data.range.toInput}
      />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {data.quickLinks.map((item) => (
          <Card key={item.slug} className="rounded-2xl border-border/70 bg-card shadow-sm">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <item.icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {item.category}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold tracking-tight">{item.label}</div>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>

              <Button asChild className="h-10 rounded-xl">
                <Link href={`/reports/${item.slug}?preset=${data.range.preset}`}>
                  Open Report
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.workspace.terminals.length === 0 ? (
        <EmptyState
          title="No terminals available"
          message="This company does not have active terminals configured yet."
          icon={Building2}
        />
      ) : null}
    </div>
  );
}
