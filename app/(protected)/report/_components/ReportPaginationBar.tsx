import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportPaginationDto } from "../_services/_dto/report.dto";
import type { ReportPrintableView, ReportSortOrder } from "./report-workspace-config";

export function ReportPaginationBar({
  pagination,
  basePath,
  view,
  from,
  to,
  activeTerminalId,
  sortOrder,
}: {
  pagination: ReportPaginationDto;
  basePath: string;
  view: ReportPrintableView;
  from: string;
  to: string;
  activeTerminalId?: string;
  sortOrder?: ReportSortOrder;
}) {
  if (pagination.totalItems <= pagination.pageSize) {
    return null;
  }

  return (
    <Card className="rounded-3xl border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages} / {pagination.totalItems} records
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild={pagination.hasPreviousPage}
            variant="outline"
            className="rounded-2xl"
            disabled={!pagination.hasPreviousPage}
          >
            {pagination.hasPreviousPage ? (
              <Link
                href={buildReportHref({
                  basePath,
                  view,
                  from,
                  to,
                  terminalId: activeTerminalId,
                  page: Math.max(1, pagination.page - 1),
                  sortOrder,
                })}
              >
                Previous
              </Link>
            ) : (
              <span>Previous</span>
            )}
          </Button>
          <Button
            asChild={pagination.hasNextPage}
            variant="outline"
            className="rounded-2xl"
            disabled={!pagination.hasNextPage}
          >
            {pagination.hasNextPage ? (
              <Link
                href={buildReportHref({
                  basePath,
                  view,
                  from,
                  to,
                  terminalId: activeTerminalId,
                  page: pagination.page + 1,
                  sortOrder,
                })}
              >
                Next
              </Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
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
