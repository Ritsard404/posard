"use client";

import { ChevronDown, FolderOpen, Plus, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

interface InventoryToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  categories: CategoryDto[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onAddProduct: () => void;
  onBulkUpload: () => void;
  onManageCategories: () => void;
  isPending?: boolean;
}

export function InventoryToolbar({
  keyword,
  onKeywordChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  onAddProduct,
  onBulkUpload,
  onManageCategories,
  isPending = false,
}: InventoryToolbarProps) {
  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategoryId)?.categoryName ?? "All Categories";

  return (
    <div className="mb-2 flex flex-col gap-3">
      <div className="relative w-full max-w-xl group">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
        <Input
          id="inventory-search"
          placeholder="Search products by name or barcode..."
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          aria-busy={isPending}
          className="h-11 rounded-xl border-white/10 bg-background/50 pl-10 font-medium transition-all focus:border-accent/50 focus:ring-0"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-between gap-2 rounded-xl border-white/10 bg-background/50 px-4 font-bold sm:w-auto"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="size-4 text-accent" />
                <span>{selectedCategoryName}</span>
              </span>
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 glass-card border-white/5 p-1">
            <DropdownMenuItem onClick={() => onCategoryChange(null)} className="rounded-lg font-medium">
              All Categories
            </DropdownMenuItem>
            {categories.map((category) => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className="rounded-lg font-medium"
              >
                {category.categoryName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isPending ? (
          <p className="text-xs font-medium text-muted-foreground">
            Updating products...
          </p>
        ) : null}

        <Button
          id="btn-manage-categories"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-white/5 bg-background/50 font-bold hover:bg-white/5 sm:w-auto"
          onClick={onManageCategories}
        >
          <FolderOpen className="size-4 text-muted-foreground transition-colors group-hover:text-accent" />
          <span>Categories</span>
        </Button>

        <Button
          id="btn-bulk-upload"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-white/5 bg-background/50 font-bold hover:bg-white/5 sm:w-auto"
          onClick={onBulkUpload}
        >
          <Upload className="size-4 text-muted-foreground transition-colors group-hover:text-emerald-500" />
          <span>Import CSV</span>
        </Button>

        <Button
          id="btn-add-product"
          className="h-11 w-full gap-2 rounded-xl px-6 font-bold glow-on-hover sm:w-auto"
          onClick={onAddProduct}
        >
          <Plus className="size-5" />
          <span>New Product</span>
        </Button>
      </div>
    </div>
  );
}
