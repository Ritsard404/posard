import type { ReactNode } from "react";
import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-background shadow-sm">
      <CardContent className="space-y-1.5 p-3 sm:p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="break-words text-lg font-black tracking-tight text-foreground sm:text-xl">
          {value}
        </div>
        {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ReportSummaryStrip({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; hint?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <SummaryMetric
          key={metric.label}
          label={metric.label}
          value={metric.value}
          hint={metric.hint}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Nothing to show",
  message,
  icon: Icon = Inbox,
  tone = "empty",
}: {
  title?: string;
  message: string;
  icon?: LucideIcon;
  tone?: "empty" | "error";
}) {
  return (
    <Card
      className={cn(
        "rounded-3xl border-dashed",
        tone === "error" ? "border-destructive/30 bg-destructive/5" : "bg-muted/15",
      )}
    >
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <div
          className={cn(
            "rounded-2xl p-3",
            tone === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold tracking-tight">{title}</div>
          <div className="max-w-2xl text-sm text-muted-foreground">{message}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportSectionCard({
  title,
  description,
  badge,
  actions,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-border/70 bg-background shadow-sm">
      <CardHeader className="gap-3 border-b border-border/60 bg-muted/10 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                  {badge}
                </Badge>
              ) : null}
              <CardTitle className="text-lg tracking-tight sm:text-xl">{title}</CardTitle>
            </div>
            <CardDescription className="max-w-3xl text-sm leading-6">
              {description}
            </CardDescription>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
}

export function ReportListCard({
  title,
  subtitle,
  badges,
  value,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  value?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background p-4 shadow-sm transition-colors">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 text-base font-semibold tracking-tight text-foreground">
              {title}
            </div>
            {badges}
          </div>
          {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
          {meta ? <ReportFieldList>{meta}</ReportFieldList> : null}
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          {value ? <div className="text-left text-lg font-semibold lg:text-right">{value}</div> : null}
          {actions ? <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ReportFieldList({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

export function ReportField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/35 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function ReportErrorState({ message }: { message: string }) {
  return (
    <EmptyState
      title="Unable to load this report"
      message={message}
      icon={AlertCircle}
      tone="error"
    />
  );
}
