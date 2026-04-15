"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminPaginationControlsProps {
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 20, 50] as const;

export function AdminPaginationControls({
  page,
  size,
  totalCount,
  totalPages,
  onPageChange,
  onSizeChange,
}: AdminPaginationControlsProps) {
  const from = totalCount === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {totalCount === 0 ? "No records found" : `Showing ${from}-${to} of ${totalCount}`}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Rows</span>
          {PAGE_SIZES.map((pageSize) => (
            <Button
              key={pageSize}
              type="button"
              variant={pageSize === size ? "default" : "outline"}
              size="sm"
              onClick={() => onSizeChange(pageSize)}
            >
              {pageSize}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="min-w-24 text-center text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

