import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportPaginationDto } from "../_services/_dto/report.dto";
import type { ReportPrintableView, ReportSortOrder } from "./report-workspace-config";
import type { ReportPeriod } from "@/app/(protected)/reports/_components/reports-config";
import type { InvoiceDocumentItemDto } from "../_services/_dto/report.dto";

export function ReportPaginationBar({
  pagination,
  basePath,
  view,
  from,
  to,
  activeTerminalId,
  sortOrder,
  period,
  documentType,
  trainMode,
  keyword,
  status,
  branchId,
  cashierId,
}: {
  pagination: ReportPaginationDto;
  basePath: string;
  view: ReportPrintableView;
  from: string;
  to: string;
  activeTerminalId?: string;
  sortOrder?: ReportSortOrder;
  period?: ReportPeriod;
  documentType?: InvoiceDocumentItemDto["type"] | "all";
  trainMode?: "all" | "training" | "live";
  keyword?: string;
  status?: "PAID" | "VOID" | "RETURNED" | "CANCELLED";
  branchId?: string;
  cashierId?: string;
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
                  period,
                  documentType,
                  trainMode,
                  keyword,
                  status,
                  branchId,
                  cashierId,
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
                  period,
                  documentType,
                  trainMode,
                  keyword,
                  status,
                  branchId,
                  cashierId,
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
  period?: ReportPeriod;
  documentType?: InvoiceDocumentItemDto["type"] | "all";
  trainMode?: "all" | "training" | "live";
  keyword?: string;
  status?: "PAID" | "VOID" | "RETURNED" | "CANCELLED";
  branchId?: string;
  cashierId?: string;
}) {
  const params = new URLSearchParams({
    view: input.view,
    preset: "custom",
    from: input.from,
    to: input.to,
  });

  if (input.period) {
    params.set("period", input.period);
  }

  if (input.terminalId) {
    params.set("terminalId", input.terminalId);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  if (input.sortOrder) {
    params.set("sortOrder", input.sortOrder);
  }

  if (input.documentType && input.documentType !== "all") {
    params.set("documentType", input.documentType);
  }

  if (input.trainMode && input.trainMode !== "all") {
    params.set("trainMode", input.trainMode);
  }

  if (input.keyword) {
    params.set("keyword", input.keyword);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.branchId) {
    params.set("branchId", input.branchId);
  }

  if (input.cashierId) {
    params.set("cashierId", input.cashierId);
  }

  return `${input.basePath}?${params.toString()}`;
}
