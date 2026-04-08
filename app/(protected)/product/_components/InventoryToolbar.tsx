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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Lado izquierdo: búsqueda y filtro */}
      <div className="flex flex-1 items-center gap-2">
        {/* Campo de búsqueda */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="inventory-search"
            placeholder="Search products..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filtro por categoría */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
              <FolderOpen className="size-4" />
              <span className="hidden sm:inline">
                {selectedCategoryName ?? "All Categories"}
              </span>
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => onCategoryChange(null)}>
              All Categories
            </DropdownMenuItem>
            {categories.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
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
          size="sm"
          onClick={onManageCategories}
        >
          <FolderOpen className="size-4" />
          <span className="hidden sm:inline">Categories</span>
        </Button>

        <Button
          id="btn-bulk-upload"
          variant="outline"
          size="sm"
          onClick={onBulkUpload}
        >
          <Upload className="size-4" />
          <span className="hidden sm:inline">CSV Upload</span>
        </Button>

        <Button id="btn-add-product" size="sm" onClick={onAddProduct}>
          <Plus className="size-4" />
          <span>Add Product</span>
        </Button>
      </div>
    </div>
  );
}
