"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Hash,
  Info,
  LogIn,
  LogOut,
  ShoppingCart,
  Tag,
  UserRound,
} from "lucide-react";
import type { AuditTrailDto, AuditTrailItemDto } from "../_services/_dto/report.dto";
import {
  REPORT_TIME_ZONE,
  formatReportDate,
  formatReportDateTime,
  formatReportTime,
} from "@/lib/report-date-format";

function formatDate(value: Date) {
  return formatReportDate(value);
}

function formatDateTime(value: Date) {
  return formatReportDateTime(value, { seconds: true });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value: Date) {
  return formatReportTime(value);
}

function getAuditIcon(action: string) {
  if (action === "SALE_COMPLETED") return ShoppingCart;
  if (action === "LOG_IN" || action === "SET_CASH_IN_DRAWER") return LogIn;
  if (action === "LOG_OUT" || action === "SET_CASH_OUT_DRAWER") return LogOut;
  if (action.includes("CASH") || action.includes("DEBT")) return CircleDollarSign;
  return UserRound;
}

function formatActionCode(action: string) {
  return action.toLowerCase();
}

function groupAuditItemsByDay(audit: AuditTrailDto) {
  const groups = new Map<
    string,
    { label: string; badgeTop: string; badgeBottom: string; items: AuditTrailDto["items"] }
  >();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  audit.items.forEach((item) => {
    const key = item.occurredAt.toDateString();
    const label =
      item.occurredAt.toDateString() === today.toDateString()
        ? "Today"
        : item.occurredAt.toDateString() === yesterday.toDateString()
          ? "Yesterday"
          : formatDate(item.occurredAt);
    const badgeTop = new Intl.DateTimeFormat("en-US", {
      timeZone: REPORT_TIME_ZONE,
      weekday: "short",
    })
      .format(item.occurredAt)
      .toUpperCase();
    const badgeBottom = new Intl.DateTimeFormat("en-US", {
      timeZone: REPORT_TIME_ZONE,
      day: "numeric",
    }).format(item.occurredAt);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      return;
    }

    groups.set(key, { label, badgeTop, badgeBottom, items: [item] });
  });

  return [...groups.values()];
}

function EventDetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-black uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium text-foreground sm:text-base">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

function AuditEventDialog({ item }: { item: AuditTrailItemDto }) {
  const Icon = getAuditIcon(item.action);
  const summary = item.displaySummary;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="relative w-full rounded-2xl border border-border/70 bg-background px-3 py-3 text-left shadow-sm transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4"
        >
          <span className="absolute -left-[21px] top-5 size-3.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
          <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)_24px] sm:items-center">
            <time className="text-sm font-medium text-muted-foreground">
              {formatTime(item.occurredAt)}
            </time>
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 text-sm font-semibold leading-5 text-foreground sm:text-base">
                  {summary}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="max-w-full truncate">{item.terminalName ?? "No terminal"}</span>
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                  {item.actorRole}
                </Badge>
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                  {item.source === "audit_log" ? "Transaction" : "Session"}
                </Badge>
              </div>
              {item.detailRows.length > 0 || item.detailItems.length > 0 ? (
                <p className="mt-2 max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">
                  {[...item.detailRows.map((row) => `${row.label}: ${row.value}`), ...item.detailItems]
                    .slice(0, 2)
                    .join(" / ")}
                </p>
              ) : null}
            </div>
            <ChevronRight className="hidden size-5 text-muted-foreground sm:block" />
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-black">
            <Info className="size-5 text-destructive" />
            Event Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed audit event information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="h-8 rounded-full border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              success
            </Badge>
            <Badge variant="secondary" className="h-8 rounded-full px-3 text-sm font-semibold">
              low
            </Badge>
            <Badge variant="outline" className="h-8 rounded-full px-3 text-sm font-semibold">
              <UserRound className="mr-1 size-4" />
              {item.actorRole}
            </Badge>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-base font-semibold leading-6 sm:text-lg">
            {summary}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <EventDetailField
              icon={Clock}
              label="Time"
              value={formatDateTime(item.occurredAt)}
            />
            <EventDetailField icon={UserRound} label="User" value={item.actorName} />
            <EventDetailField
              icon={Tag}
              label="Action"
              value={formatActionCode(item.action)}
            />
            <EventDetailField
              icon={Hash}
              label="Entity ID"
              value={item.referenceId ?? "No reference"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <EventDetailField
              icon={Activity}
              label="Source"
              value={item.source === "audit_log" ? "Transaction" : "Session"}
            />
            <EventDetailField
              icon={CircleDollarSign}
              label="Amount"
              value={item.amount !== null ? formatCurrency(item.amount) : "No amount"}
            />
          </div>

          {item.detailRows.length > 0 || item.detailItems.length > 0 ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="text-xs font-black uppercase text-muted-foreground">
                Details
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {item.detailRows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="grid gap-1 rounded-xl bg-background px-3 py-2 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{row.label}</span>
                    <span className="break-words font-medium">{row.value}</span>
                  </div>
                ))}
                {item.detailItems.length > 0 ? (
                  <div className="rounded-xl bg-background px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Items</div>
                    <ul className="mt-2 space-y-1 text-sm font-medium">
                      {item.detailItems.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuditEventLog({ audit }: { audit: AuditTrailDto }) {
  const groups = groupAuditItemsByDay(audit);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/15 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-foreground" />
          <h2 className="text-base font-black tracking-tight sm:text-lg">Activity Log</h2>
        </div>
        <Badge variant="outline" className="h-9 rounded-full px-3 text-sm font-semibold">
          {audit.pagination.totalItems} events
        </Badge>
      </div>

      <div className="space-y-3 bg-muted/10 p-3 sm:p-4">
        {groups.map((group, groupIndex) => (
          <details
            key={group.label}
            open={groupIndex === 0}
            className="group rounded-2xl border border-transparent open:border-border/60 open:bg-background/70"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-background sm:px-3 [&::-webkit-details-marker]:hidden">
              <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-muted text-center leading-none sm:size-14">
                <span className="text-[10px] font-black uppercase text-muted-foreground">
                  {group.badgeTop}
                </span>
                <span className="text-xl font-black tracking-tight text-foreground">
                  {group.badgeBottom}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h3 className="truncate text-base font-black tracking-tight sm:text-lg">
                  {group.label}
                </h3>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {group.items.length} event{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="px-2 pb-4 sm:px-3">
              <div className="relative space-y-2 pl-6 before:absolute before:bottom-3 before:left-[10px] before:top-0 before:w-px before:bg-border">
                {group.items.map((item, index) => (
                  <AuditEventDialog
                    key={`${item.source}-${item.referenceId ?? index}-${item.occurredAt.toISOString()}`}
                    item={item}
                  />
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
