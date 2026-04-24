import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  MonitorSmartphone,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReportPrintableView } from "./report-workspace-config";

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
}) {
  const todayHref = buildReportHref({
    basePath,
    view: selectedView,
    from,
    to,
    terminalId: terminalLocked ? undefined : activeTerminalId,
    page: 1,
  });

  const resetHref = buildReportHref({
    basePath,
    view: selectedView,
    from,
    to,
    page: 1,
  });

  return (
    <Card className="sticky top-3 z-10 rounded-[28px] border-border/70 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <CardHeader className="gap-2 pb-3">
        <CardTitle className="text-lg tracking-tight">Filters</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep the selected report while adjusting the date range or terminal scope.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={basePath} method="get" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <input type="hidden" name="view" value={selectedView} />
          {!terminalLocked && activeTerminalId ? (
            <input type="hidden" name="terminalId" value={activeTerminalId} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                From
              </div>
              <Input
                type="date"
                name="from"
                defaultValue={from}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                To
              </div>
              <Input
                type="date"
                name="to"
                defaultValue={to}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="h-11 w-full rounded-2xl md:w-auto">
                <CalendarDays className="size-4" />
                Apply Filters
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <Button asChild variant="outline" className="h-11 rounded-2xl">
              <Link href={todayHref}>
                <CalendarDays className="size-4" />
                Current Range
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-11 rounded-2xl">
              <Link href={resetHref}>
                <RotateCcw className="size-4" />
                Reset Scope
              </Link>
            </Button>
          </div>
        </form>

        {showTerminalScopeSwitcher ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Terminal Scope
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 w-full justify-between rounded-2xl md:w-auto md:min-w-[280px]",
                )}
              >
                <span className="flex items-center gap-2">
                  <MonitorSmartphone className="size-4" />
                  {selectedTerminal ? selectedTerminal.name : "All terminals"}
                </span>
                <ArrowRightLeft className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 rounded-2xl">
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link
                    href={buildReportHref({
                      basePath,
                      view: selectedView,
                      from,
                      to,
                      page: 1,
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

  return `${input.basePath}?${params.toString()}`;
}

