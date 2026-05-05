import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  MonitorSmartphone,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  supportsReportSort,
  type ReportPrintableView,
  type ReportSortOrder,
} from "./report-workspace-config";

type TerminalOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export function ReportFilterBar({
  basePath,
  selectedView,
  from,
  to,
  activeTerminalId,
  selectedTerminal,
  showTerminalScopeSwitcher,
  terminalOptions,
  terminalLocked,
  sortOrder = "newest",
}: {
  basePath: string;
  selectedView: ReportPrintableView;
  from: string;
  to: string;
  activeTerminalId?: string;
  selectedTerminal?: TerminalOption | null;
  showTerminalScopeSwitcher: boolean;
  terminalOptions: TerminalOption[];
  terminalLocked?: boolean;
  sortOrder?: ReportSortOrder;
}) {
  const canSort = supportsReportSort(selectedView);
  const todayHref = buildReportHref({
    basePath,
    view: selectedView,
    from,
    to,
    terminalId: terminalLocked ? undefined : activeTerminalId,
    page: 1,
    sortOrder,
  });

  const resetHref = buildReportHref({
    basePath,
    view: selectedView,
    from,
    to,
    page: 1,
    sortOrder,
  });

  return (
    <Card className="sticky top-3 z-10 rounded-2xl border-border/70 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
          <form action={basePath} method="get" className="hidden gap-2 md:grid md:grid-cols-[minmax(140px,180px)_minmax(140px,180px)_auto]">
          <input type="hidden" name="view" value={selectedView} />
          {!terminalLocked && activeTerminalId ? (
            <input type="hidden" name="terminalId" value={activeTerminalId} />
          ) : null}
          {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
          <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                From
              </div>
              <Input
                type="date"
                name="from"
                defaultValue={from}
                className="h-9 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                To
              </div>
              <Input
                type="date"
                name="to"
                defaultValue={to}
                className="h-9 rounded-xl text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="h-9 w-full rounded-xl px-3 text-sm md:w-auto">
                <CalendarDays className="size-4" />
                Apply
              </Button>
            </div>
          </form>

          <details className="group rounded-xl border bg-muted/10 md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                Date Range
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <form action={basePath} method="get" className="grid gap-2 border-t p-2">
              <input type="hidden" name="view" value={selectedView} />
              {!terminalLocked && activeTerminalId ? (
                <input type="hidden" name="terminalId" value={activeTerminalId} />
              ) : null}
              {canSort ? <input type="hidden" name="sortOrder" value={sortOrder} /> : null}
              <Input
                type="date"
                name="from"
                defaultValue={from}
                className="h-9 rounded-xl text-sm"
              />
              <Input
                type="date"
                name="to"
                defaultValue={to}
                className="h-9 rounded-xl text-sm"
              />
              <Button type="submit" className="h-9 w-full rounded-xl px-3 text-sm">
                <CalendarDays className="size-4" />
                Apply
              </Button>
            </form>
          </details>

          <div className="flex flex-col gap-1.5 sm:flex-row xl:justify-end">
            <Button asChild variant="outline" className="h-9 rounded-xl px-3 text-sm">
              <Link href={todayHref}>
                <CalendarDays className="size-4" />
                Current Range
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-9 rounded-xl px-3 text-sm">
              <Link href={resetHref}>
                <RotateCcw className="size-4" />
                Reset Scope
              </Link>
            </Button>
          </div>
        </div>

        {showTerminalScopeSwitcher ? (
          <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-9 w-full justify-between rounded-xl px-3 text-sm md:w-auto md:min-w-[220px]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MonitorSmartphone className="size-4" />
                    {selectedTerminal ? selectedTerminal.name : "All terminals"}
                  </span>
                  <ArrowRightLeft className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-xl">
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link
                      href={buildReportHref({
                        basePath,
                        view: selectedView,
                        from,
                        to,
                        page: 1,
                        sortOrder,
                      })}
                    >
                      <MonitorSmartphone className="size-4" />
                      <span className="flex-1">All terminals</span>
                    </Link>
                  </DropdownMenuItem>
                  {terminalOptions.map((terminalOption) => (
                    <DropdownMenuItem key={terminalOption.id} asChild className="rounded-xl">
                      <Link
                        href={buildReportHref({
                          basePath,
                          view: selectedView,
                          from,
                          to,
                          terminalId: terminalOption.id,
                          page: 1,
                          sortOrder,
                        })}
                      >
                        <MonitorSmartphone className="size-4" />
                        <span className="flex-1">{terminalOption.name}</span>
                        {terminalOption.isActive ? <span className="text-xs text-muted-foreground">Live</span> : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {canSort ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-9 w-full justify-between rounded-xl px-3 text-sm md:w-auto md:min-w-[190px]",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Clock3 className="size-4" />
                      {sortOrder === "oldest" ? "Oldest first" : "Newest first"}
                    </span>
                    <ArrowRightLeft className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link
                        href={buildReportHref({
                          basePath,
                          view: selectedView,
                          from,
                          to,
                          terminalId: terminalLocked ? undefined : activeTerminalId,
                          page: 1,
                          sortOrder: "newest",
                        })}
                      >
                        <Clock3 className="size-4" />
                        <span className="flex-1">Newest first</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link
                        href={buildReportHref({
                          basePath,
                          view: selectedView,
                          from,
                          to,
                          terminalId: terminalLocked ? undefined : activeTerminalId,
                          page: 1,
                          sortOrder: "oldest",
                        })}
                      >
                        <Clock3 className="size-4" />
                        <span className="flex-1">Oldest first</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildReportHref(input: {
  basePath: string;
  view: ReportPrintableView;
  from: string;
  to: string;
  terminalId?: string;
  page?: number;
  sortOrder?: ReportSortOrder;
}) {
  const params = new URLSearchParams({
    view: input.view,
    from: input.from,
    to: input.to,
  });

  if (input.terminalId) {
    params.set("terminalId", input.terminalId);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  if (input.sortOrder) {
    params.set("sortOrder", input.sortOrder);
  }

  return `${input.basePath}?${params.toString()}`;
}
