"use client";

import { Search, Plus, Upload, FolderOpen, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

// ─────────────────────────────────────────────
// Props del toolbar de inventario
// ─────────────────────────────────────────────

interface InventoryToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  categories: CategoryDto[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onAddProduct: () => void;
  onBulkUpload: () => void;
  onManageCategories: () => void;
}

// ─────────────────────────────────────────────
// Barra de herramientas: búsqueda, filtro y acciones
// ─────────────────────────────────────────────

export function InventoryToolbar({
  keyword,
  onKeywordChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  onAddProduct,
  onBulkUpload,
  onManageCategories,
}: InventoryToolbarProps) {
  // Obtener el nombre de la categoría seleccionada para mostrar en el botón
  const selectedCategoryName =
    categories.find((c) => c.id === selectedCategoryId)?.categoryName ?? null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
      {/* Lado izquierdo: búsqueda y filtro */}
      <div className="flex flex-1 items-center gap-3">
        {/* Campo de búsqueda */}
        <div className="relative w-full max-w-sm group">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input
            id="inventory-search"
            placeholder="Search products by name or barcode..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="h-11 pl-10 rounded-xl bg-background/50 border-white/10 focus:border-accent/50 focus:ring-0 transition-all font-medium"
          />
        </div>

        {/* Filtro por categoría */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 shrink-0 gap-2 rounded-xl border-white/10 bg-background/50 font-bold px-4">
              <FolderOpen className="size-4 text-accent" />
              <span className="hidden sm:inline">
                {selectedCategoryName ?? "All Categories"}
              </span>
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 glass-card border-white/5 p-1">
            <DropdownMenuItem onClick={() => onCategoryChange(null)} className="rounded-lg font-medium">
              All Categories
            </DropdownMenuItem>
            {categories.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className="rounded-lg font-medium"
              >
                {cat.categoryName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lado derecho: acciones */}
      <div className="flex items-center gap-2">
        <Button
          id="btn-manage-categories"
          variant="outline"
          className="h-11 rounded-xl border-white/5 bg-background/50 font-bold gap-2 group hover:bg-white/5"
          onClick={onManageCategories}
        >
          <FolderOpen className="size-4 text-muted-foreground group-hover:text-accent transition-colors" />
          <span className="hidden sm:inline">Categories</span>
        </Button>

        <Button
          id="btn-bulk-upload"
          variant="outline"
          className="h-11 rounded-xl border-white/5 bg-background/50 font-bold gap-2 group hover:bg-white/5"
          onClick={onBulkUpload}
        >
          <Upload className="size-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          <span className="hidden sm:inline">Import CSV</span>
        </Button>

        <Button 
          id="btn-add-product" 
          className="h-11 rounded-xl font-bold gap-2 glow-on-hover px-6" 
          onClick={onAddProduct}
        >
          <Plus className="size-5" />
          <span>New Product</span>
        </Button>
      </div>
    </div>
  );
}
