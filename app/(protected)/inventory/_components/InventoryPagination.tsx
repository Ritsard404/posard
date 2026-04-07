"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────
// Props de paginación derivadas de PageResponse
// ─────────────────────────────────────────────

interface InventoryPaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─────────────────────────────────────────────
// Controles de paginación
// ─────────────────────────────────────────────

export function InventoryPagination({
  page,
  totalPages,
  totalElements,
  hasNext,
  hasPrevious,
  size,
  onPageChange,
  onSizeChange,
}: InventoryPaginationProps) {
  // No mostrar paginación si no hay datos
  if (totalElements === 0) return null;

  // Calcular rango de elementos visibles
  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {/* Indicador de rango */}
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground">{totalElements}</span>{" "}
        products
      </p>

      <div className="flex items-center gap-4">
        {/* Selector de tamaño de página */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="page-size-select"
            className="text-xs text-muted-foreground"
          >
            Rows
          </label>
          <select
            id="page-size-select"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center gap-1">
          <Button
            id="btn-prev-page"
            variant="outline"
            size="icon-xs"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous page</span>
          </Button>

          <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
            Page{" "}
            <span className="font-medium text-foreground">{page + 1}</span> of{" "}
            <span className="font-medium text-foreground">
              {totalPages || 1}
            </span>
          </span>

          <Button
            id="btn-next-page"
            variant="outline"
            size="icon-xs"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
