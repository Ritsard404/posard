"use client";

import { useState } from "react";
import { Barcode, Camera, ChevronDown, FolderOpen, Loader2, Plus, ScanLine, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";
import { cameraScanService } from "@/lib/scanning/camera-scan.client";
import type { ProductBarcodeStatusFilter } from "@/app/(protected)/product/_services/product-query";

interface InventoryToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  categories: CategoryDto[];
  selectedCategoryId: string | null;
  barcodeStatus: ProductBarcodeStatusFilter;
  hardwareScannerEnabled: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  onBarcodeStatusChange: (status: ProductBarcodeStatusFilter) => void;
  onToggleHardwareScanner: () => void;
  onAddProduct: () => void;
  onBulkUpload: () => void;
  onManageCategories: () => void;
  onGenerateFilteredBarcodes: () => void;
  onPrintFilteredBarcodes: () => void;
  isPending?: boolean;
}

export function InventoryToolbar({
  keyword,
  onKeywordChange,
  categories,
  selectedCategoryId,
  barcodeStatus,
  hardwareScannerEnabled,
  onCategoryChange,
  onBarcodeStatusChange,
  onToggleHardwareScanner,
  onAddProduct,
  onBulkUpload,
  onManageCategories,
  onGenerateFilteredBarcodes,
  onPrintFilteredBarcodes,
  isPending = false,
}: InventoryToolbarProps) {
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategoryId)?.categoryName ?? "All Categories";

  async function handleCameraScan() {
    try {
      setIsCameraScanning(true);
      const result = await cameraScanService.scanBarcode();
      const value = result.value.trim();

      if (!value) {
        return;
      }

      onKeywordChange(value);
      toast.success("Barcode scanned.", {
        description: "Inventory search was updated.",
      });
    } catch {
      toast.error("Camera scan unavailable.", {
        description: "Use a hardware scanner or type the barcode manually.",
      });
    } finally {
      setIsCameraScanning(false);
    }
  }

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-between gap-2 rounded-xl border-white/10 bg-background/50 px-4 font-bold sm:w-auto"
            >
              <span className="flex items-center gap-2">
                <Barcode className="size-4 text-accent" />
                <span>
                  {barcodeStatus === "with"
                    ? "With Barcode"
                    : barcodeStatus === "without"
                      ? "Missing Barcode"
                      : "All Barcodes"}
                </span>
              </span>
              <ChevronDown className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 glass-card border-white/5 p-1">
            <DropdownMenuItem onClick={() => onBarcodeStatusChange("all")} className="rounded-lg font-medium">
              All Barcodes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBarcodeStatusChange("with")} className="rounded-lg font-medium">
              With Barcode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBarcodeStatusChange("without")} className="rounded-lg font-medium">
              Missing Barcode
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isPending ? (
          <p className="text-xs font-medium text-muted-foreground">
            Updating products...
          </p>
        ) : null}

        <Button
          id="btn-scan-product"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-white/5 bg-background/50 font-bold hover:bg-white/5 sm:w-auto"
          disabled={isCameraScanning}
          onClick={() => void handleCameraScan()}
        >
          {isCameraScanning ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Camera className="size-4 text-muted-foreground" />
          )}
          <span>Scan</span>
        </Button>

        <Button
          id="btn-toggle-hardware-scanner"
          variant={hardwareScannerEnabled ? "secondary" : "outline"}
          className="h-11 w-full gap-2 rounded-xl border-white/5 bg-background/50 font-bold hover:bg-white/5 sm:w-auto"
          onClick={onToggleHardwareScanner}
        >
          <ScanLine className="size-4 text-muted-foreground" />
          <span>{hardwareScannerEnabled ? "Scanner On" : "Scanner Off"}</span>
        </Button>

        <Button
          id="btn-generate-filtered-barcodes"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-white/5 bg-background/50 font-bold hover:bg-white/5 sm:w-auto"
          onClick={onGenerateFilteredBarcodes}
        >
          <Barcode className="size-4 text-muted-foreground" />
          <span>Generate</span>
        </Button>

        <Button
          id="btn-print-filtered-barcodes"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-white/5 bg-background/50 font-bold hover:bg-white/5 sm:w-auto"
          onClick={onPrintFilteredBarcodes}
        >
          <Barcode className="size-4 text-muted-foreground" />
          <span>Labels</span>
        </Button>

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
