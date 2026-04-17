"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { InventoryStatsBar } from "./InventoryStatsBar";
import { InventoryToolbar } from "./InventoryToolbar";
import { ProductDataTable } from "./ProductDataTable";
import { InventoryPagination } from "./InventoryPagination";
import { ProductFormSheet } from "./ProductFormSheet";
import { CategoryManagerSheet } from "./CategoryManagerSheet";
import { CsvUploadDialog } from "./CsvUploadDialog";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";

import { deleteProduct } from "@/app/(protected)/product/_actions/product.actions";
import type {
  ProductDto,
  PageResponse,
} from "@/app/(protected)/product/_services/_dto/product.dto";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";
import {
  PRODUCT_QUERY_DEFAULTS,
  type ProductListQuery,
} from "@/app/(protected)/product/_services/product-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InventoryPageClientProps {
  initialProducts: PageResponse<ProductDto>;
  initialCategories: CategoryDto[];
  query: ProductListQuery;
}

export function InventoryPageClient({
  initialProducts,
  initialCategories,
  query,
}: InventoryPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftKeyword, setDraftKeyword] = useState(query.keyword);
  const [isPending, startTransition] = useTransition();

  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<ProductDto | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageData = initialProducts;
  const categories = initialCategories;

  useEffect(() => {
    setDraftKeyword(query.keyword);
  }, [query.keyword]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function updateQuery(
    next: Partial<ProductListQuery>,
    navigationMode: "push" | "replace" = "push",
  ) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery: ProductListQuery = {
      page: next.page ?? query.page,
      size: next.size ?? query.size,
      keyword: next.keyword ?? query.keyword,
      categoryId:
        next.categoryId === undefined ? query.categoryId : next.categoryId,
    };

    if (nextQuery.keyword) {
      params.set("keyword", nextQuery.keyword);
    } else {
      params.delete("keyword");
    }

    if (nextQuery.categoryId) {
      params.set("categoryId", nextQuery.categoryId);
    } else {
      params.delete("categoryId");
    }

    if (nextQuery.page !== PRODUCT_QUERY_DEFAULTS.page) {
      params.set("page", String(nextQuery.page));
    } else {
      params.delete("page");
    }

    if (nextQuery.size !== PRODUCT_QUERY_DEFAULTS.size) {
      params.set("size", String(nextQuery.size));
    } else {
      params.delete("size");
    }

    const nextHref = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    startTransition(() => {
      if (navigationMode === "replace") {
        router.replace(nextHref, { scroll: false });
        return;
      }

      router.push(nextHref, { scroll: false });
    });
  }

  function refreshRoute() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleKeywordChange(value: string) {
    setDraftKeyword(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      updateQuery(
        {
          keyword: value.trim(),
          page: PRODUCT_QUERY_DEFAULTS.page,
        },
        "replace",
      );
    }, 300);
  }

  function handleCategoryChange(categoryId: string | null) {
    updateQuery({
      categoryId,
      page: PRODUCT_QUERY_DEFAULTS.page,
    });
  }

  function handlePageChange(page: number) {
    updateQuery({ page });
  }

  function handleSizeChange(size: number) {
    updateQuery({
      size,
      page: PRODUCT_QUERY_DEFAULTS.page,
    });
  }

  function handleAddProduct() {
    setEditingProduct(null);
    setProductSheetOpen(true);
  }

  function handleEditProduct(product: ProductDto) {
    setEditingProduct(product);
    setProductSheetOpen(true);
  }

  function handleAdjustStock(product: ProductDto) {
    setStockProduct(product);
    setStockDialogOpen(true);
  }

  function handleDeleteProduct(product: ProductDto) {
    setDeletingProduct(product);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!deletingProduct) return;

    const result = await deleteProduct(deletingProduct.id);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    setDeletingProduct(null);
    refreshRoute();
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute top-0 -left-10 h-96 w-96 rounded-full bg-accent/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-10 h-96 w-96 rounded-full bg-emerald-500/5 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-40 h-96 w-96 rounded-full bg-indigo-500/5 opacity-50 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <InventoryStatsBar
          products={pageData.content}
          totalElements={pageData.totalElements}
          categories={categories}
        />

        <InventoryToolbar
          keyword={draftKeyword}
          onKeywordChange={handleKeywordChange}
          categories={categories}
          selectedCategoryId={query.categoryId}
          onCategoryChange={handleCategoryChange}
          onAddProduct={handleAddProduct}
          onBulkUpload={() => setCsvDialogOpen(true)}
          onManageCategories={() => setCategorySheetOpen(true)}
          isPending={isPending}
        />

        <ProductDataTable
          products={pageData.content}
          isLoading={false}
          onEdit={handleEditProduct}
          onAdjustStock={handleAdjustStock}
          onDelete={handleDeleteProduct}
        />

        <InventoryPagination
          page={pageData.page}
          totalPages={pageData.totalPages}
          totalElements={pageData.totalElements}
          hasNext={pageData.hasNext}
          hasPrevious={pageData.hasPrevious}
          size={pageData.size}
          onPageChange={handlePageChange}
          onSizeChange={handleSizeChange}
          isPending={isPending}
        />

        <ProductFormSheet
          open={productSheetOpen}
          onOpenChange={setProductSheetOpen}
          product={editingProduct}
          categories={categories}
          onSuccess={refreshRoute}
        />

        <CategoryManagerSheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          categories={categories}
          onSuccess={refreshRoute}
        />

        <CsvUploadDialog
          open={csvDialogOpen}
          onOpenChange={setCsvDialogOpen}
          onSuccess={refreshRoute}
        />

        <StockAdjustmentDialog
          open={stockDialogOpen}
          onOpenChange={setStockDialogOpen}
          product={stockProduct}
          onSuccess={refreshRoute}
        />

        <AlertDialog
          open={deletingProduct !== null}
          onOpenChange={(open) => !open && setDeletingProduct(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deletingProduct?.name}</span>?
                This action is a soft delete and can be reversed by an
                administrator.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
