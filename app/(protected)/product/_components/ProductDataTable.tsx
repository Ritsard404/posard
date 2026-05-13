"use client";

import {
  ArrowUpDown,
  Barcode,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StorageImage } from "@/components/storage/StorageImage";
import type { ProductDto } from "@/app/(protected)/product/_services/_dto/product.dto";

interface ProductDataTableProps {
  products: ProductDto[];
  isLoading: boolean;
  onEdit: (product: ProductDto) => void;
  onAdjustStock: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
  selectedIds?: string[];
  onSelectionChange?: (productId: string, selected: boolean) => void;
  onGenerateBarcode?: (product: ProductDto, replaceExisting: boolean) => void;
  onPrintBarcode?: (product: ProductDto) => void;
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        available
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "border-red-500/30 bg-red-500/10 text-red-600"
      }`}
    >
      <span className={`size-1.5 rounded-full ${available ? "bg-emerald-500" : "bg-red-500"}`} />
      {available ? "Active" : "Disabled"}
    </span>
  );
}

function QuantityDisplay({
  quantity,
  baseUnit,
  trackInventory,
}: {
  quantity: number | null;
  baseUnit: string;
  trackInventory: boolean;
}) {
  if (!trackInventory) {
    return <span className="text-sm text-muted-foreground">Inventory off</span>;
  }

  const numericQuantity = quantity ?? 0;
  const isLow = numericQuantity <= 5;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-semibold tabular-nums ${isLow ? "text-amber-600" : "text-foreground"}`}>
        {numericQuantity.toLocaleString()} {baseUnit}
      </span>
      {isLow ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
          Low stock
        </span>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-5 py-16 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border/70 bg-background">
        <ImageIcon className="size-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-lg font-medium">No matching products</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try a different search term or change the current category filter.
      </p>
    </div>
  );
}

function MobileCard({
  product,
  onEdit,
  onAdjustStock,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  onGenerateBarcode,
  onPrintBarcode,
}: {
  product: ProductDto;
  onEdit: (product: ProductDto) => void;
  onAdjustStock: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
  selectedIds?: string[];
  onSelectionChange?: (productId: string, selected: boolean) => void;
  onGenerateBarcode?: (product: ProductDto, replaceExisting: boolean) => void;
  onPrintBarcode?: (product: ProductDto) => void;
}) {
  const selected = selectedIds.includes(product.id);

  return (
    <Card className="rounded-2xl border-border/70 bg-background/90 shadow-sm md:hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {onSelectionChange ? (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectionChange(product.id, checked === true)}
                aria-label={`Select ${product.name}`}
              />
            ) : null}
            <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/20">
              <StorageImage
                src={product.productImageUrl}
                alt={product.name}
                fill
                sizes="56px"
                className="object-cover"
                fallback={<ImageIcon className="size-5 text-muted-foreground/40" />}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{product.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.categoryName ?? "Uncategorized"}
              </p>
            </div>
          </div>
          <AvailabilityBadge available={product.isAvailable} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Price</p>
            <p className="mt-1 font-semibold tabular-nums">₱ {product.price.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost</p>
            <p className="mt-1 font-semibold tabular-nums">₱ {product.cost.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory</p>
          <div className="mt-1">
            <QuantityDisplay
              quantity={product.quantity}
              baseUnit={product.baseUnit}
              trackInventory={product.trackInventory}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{product.itemType}</span>
            <span>{product.vatType}</span>
            {product.barcode ? <span>Barcode {product.barcode}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(product)} className="h-10 rounded-xl">
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAdjustStock(product)} className="h-10 rounded-xl">
            <ArrowUpDown className="size-4" />
            Stock
          </Button>
          <Button variant="outline" size="sm" onClick={() => onGenerateBarcode?.(product, Boolean(product.barcode))} className="h-10 rounded-xl">
            <Barcode className="size-4" />
            {product.barcode ? "Regen" : "Code"}
          </Button>
          <Button variant="outline" size="sm" disabled={!product.barcode} onClick={() => onPrintBarcode?.(product)} className="h-10 rounded-xl">
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(product)} className="h-10 rounded-xl text-destructive">
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileSkeleton() {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="rounded-2xl border-border/70">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <Skeleton className="h-24 rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DesktopSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="border-b border-border">
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
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-14" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function ProductDataTable({
  products,
  isLoading,
  onEdit,
  onAdjustStock,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  onGenerateBarcode,
  onPrintBarcode,
}: ProductDataTableProps) {
  if (isLoading) {
    return (
      <>
        <MobileSkeleton />
        <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Inventory
                  </th>
                  <th className="px-5 py-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <DesktopSkeleton />
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {products.map((product) => (
          <MobileCard
            key={product.id}
            product={product}
            onEdit={onEdit}
            onAdjustStock={onAdjustStock}
            onDelete={onDelete}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
            onGenerateBarcode={onGenerateBarcode}
            onPrintBarcode={onPrintBarcode}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-3 py-4 text-left">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Product
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Price
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Cost
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Barcode
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Inventory
                </th>
                <th className="px-5 py-4 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border/70 transition-colors hover:bg-muted/20">
                  <td className="px-3 py-4">
                    {onSelectionChange ? (
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={(checked) => onSelectionChange(product.id, checked === true)}
                        aria-label={`Select ${product.name}`}
                      />
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                        <StorageImage
                          src={product.productImageUrl}
                          alt={product.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                          fallback={<ImageIcon className="size-4 text-muted-foreground/40" />}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{product.itemType}</span>
                          <span>{product.vatType}</span>
                          {product.barcode ? <span>{product.barcode}</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline">{product.categoryName ?? "Uncategorized"}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right font-medium tabular-nums">
                    ₱ {product.price.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground tabular-nums">
                    ₱ {product.cost.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <AvailabilityBadge available={product.isAvailable} />
                  </td>
                  <td className="px-5 py-4">
                    {product.barcode ? (
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {product.barcode}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] text-muted-foreground">
                        Missing
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <QuantityDisplay
                      quantity={product.quantity}
                      baseUnit={product.baseUnit}
                      trackInventory={product.trackInventory}
                    />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Pencil className="mr-2 size-4" />
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdjustStock(product)}>
                          <ArrowUpDown className="mr-2 size-4" />
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onGenerateBarcode?.(product, Boolean(product.barcode))}>
                          <Barcode className="mr-2 size-4" />
                          {product.barcode ? "Regenerate Barcode" : "Generate Barcode"}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!product.barcode} onClick={() => onPrintBarcode?.(product)}>
                          <Printer className="mr-2 size-4" />
                          Print Barcode
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(product)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 size-4" />
                          Delete Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
