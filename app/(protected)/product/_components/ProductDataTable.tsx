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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
        available
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          : "bg-red-500/10 text-red-500 border border-red-500/20"
      }`}
    >
      <span
        className={`size-1.5 rounded-full animate-pulse ${available ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
      />
      {available ? "Active" : "Disabled"}
    </span>
  );
}

// ─────────────────────────────────────────────
// Badge de cantidad con advertencia de stock bajo
// ─────────────────────────────────────────────

function QuantityDisplay({ quantity }: { quantity: number | null }) {
  if (quantity === null) {
    return <span className="text-muted-foreground/40 font-mono">—</span>;
  }

  const isLow = quantity <= 5;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={`font-bold tabular-nums text-sm ${
          isLow
            ? "text-amber-500"
            : "text-foreground"
        }`}
      >
        {quantity.toLocaleString()}
      </span>
      {isLow && (
        <span className="text-[9px] font-extrabold uppercase tracking-tighter text-amber-500/80 bg-amber-500/10 px-1 rounded">Low Stock</span>
      )}
    </div>
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
    <div className="overflow-hidden rounded-2xl border border-white/5 glass-card shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-5 py-4 text-left font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                Product Information
              </th>
              <th className="px-5 py-4 text-left font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                Category
              </th>
              <th className="px-5 py-4 text-right font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                List Price
              </th>
              <th className="hidden px-5 py-4 text-right font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 md:table-cell">
                Unit Cost
              </th>
              <th className="px-5 py-4 text-right font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                Current Stock
              </th>
              <th className="hidden px-5 py-4 text-left font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 lg:table-cell">
                Status
              </th>
              <th className="px-5 py-4 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <TableSkeletonRows />
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-20 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="size-16 rounded-full bg-white/5 flex items-center justify-center">
                      <ImageIcon className="size-8 opacity-20" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-heading font-bold text-foreground">No matching products</p>
                      <p className="text-sm max-w-[250px] mx-auto text-muted-foreground font-medium">
                        Try refining your search or selecting a different category.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="group border-white/5 transition-all hover:bg-white/[0.04]"
                >
                  {/* Nombre + imagen */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {/* Placeholder de ícono cuando no hay imagen */}
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5 group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                        <ImageIcon className="size-5 text-muted-foreground group-hover:text-accent transition-colors" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-bold text-sm tracking-tight group-hover:text-accent transition-colors">
                          {product.name}
                        </p>
                        {product.barcode && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-medium text-muted-foreground/60 bg-white/5 px-1.5 rounded uppercase">SKU: {product.barcode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="px-5 py-4">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-white/5 border-white/10 text-muted-foreground">
                      {product.categoryName ?? "Uncategorized"}
                    </Badge>
                  </td>

                  {/* Precio */}
                  <td className="px-5 py-4 text-right tabular-nums font-bold text-foreground">
                    ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Costo (oculto en móvil) */}
                  <td className="hidden px-5 py-4 text-right tabular-nums text-muted-foreground/70 font-medium md:table-cell">
                    ₱{product.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Cantidad / Stock */}
                  <td className="px-5 py-4 text-right">
                    <QuantityDisplay quantity={product.quantity} />
                  </td>

                  {/* Estado (oculto en pantallas pequeñas) */}
                  <td className="hidden px-5 py-4 lg:table-cell">
                    <AvailabilityBadge available={product.isAvailable} />
                  </td>

                  {/* Menú de acciones por fila */}
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 glass-card border-white/5 p-1">
                        <DropdownMenuItem onClick={() => onEdit(product)} className="rounded-lg font-bold gap-2">
                          <Pencil className="size-4 text-accent" />
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdjustStock(product)} className="rounded-lg font-bold gap-2">
                          <ArrowUpDown className="size-4 text-emerald-500" />
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem
                          className="rounded-lg font-bold gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => onDelete(product)}
                        >
                          <Trash2 className="size-4" />
                          Delete Product
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
