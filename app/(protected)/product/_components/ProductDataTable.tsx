"use client";

import {
  ImageIcon,
  MoreHorizontal,
  Pencil,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProductDto } from "@/app/(protected)/product/_services/_dto/product.dto";

// ─────────────────────────────────────────────
// Props de la tabla de productos
// ─────────────────────────────────────────────

interface ProductDataTableProps {
  products: ProductDto[];
  isLoading: boolean;
  onEdit: (product: ProductDto) => void;
  onAdjustStock: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

// ─────────────────────────────────────────────
// Esqueleto de filas de carga
// ─────────────────────────────────────────────

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-md" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-14" />
          </td>
          <td className="hidden px-4 py-3 text-right md:table-cell">
            <Skeleton className="ml-auto h-4 w-14" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-10" />
          </td>
          <td className="hidden px-4 py-3 lg:table-cell">
            <Skeleton className="h-5 w-14 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="size-8 rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// Badge de disponibilidad con color semántico
// ─────────────────────────────────────────────

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        available
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${available ? "bg-emerald-500" : "bg-red-500"}`}
      />
      {available ? "Active" : "Inactive"}
    </span>
  );
}

// ─────────────────────────────────────────────
// Badge de cantidad con advertencia de stock bajo
// ─────────────────────────────────────────────

function QuantityDisplay({ quantity }: { quantity: number | null }) {
  if (quantity === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const isLow = quantity <= 5;

  return (
    <span
      className={`font-medium tabular-nums ${
        isLow
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground"
      }`}
    >
      {quantity}
      {isLow && (
        <span className="ml-1 text-[10px] font-normal text-amber-500">Low</span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────
// Tabla principal de productos
// ─────────────────────────────────────────────

export function ProductDataTable({
  products,
  isLoading,
  onEdit,
  onAdjustStock,
  onDelete,
}: ProductDataTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Product
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Price
              </th>
              <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">
                Cost
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Stock
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeletonRows />
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="size-8 opacity-40" />
                    <p className="text-sm font-medium">No products found</p>
                    <p className="text-xs">
                      Try adjusting your search or filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                >
                  {/* Nombre + imagen */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Placeholder de ícono cuando no hay imagen */}
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {product.name}
                        </p>
                        {product.barcode && (
                          <p className="truncate text-xs text-muted-foreground">
                            {product.barcode}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[11px]">
                      {product.categoryName ?? "—"}
                    </Badge>
                  </td>

                  {/* Precio */}
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    ₱{product.price.toFixed(2)}
                  </td>

                  {/* Costo (oculto en móvil) */}
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">
                    ₱{product.cost.toFixed(2)}
                  </td>

                  {/* Cantidad / Stock */}
                  <td className="px-4 py-3 text-right">
                    <QuantityDisplay quantity={product.quantity} />
                  </td>

                  {/* Estado (oculto en pantallas pequeñas) */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <AvailabilityBadge available={product.isAvailable} />
                  </td>

                  {/* Menú de acciones por fila */}
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdjustStock(product)}>
                          <ArrowUpDown className="size-4" />
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(product)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
