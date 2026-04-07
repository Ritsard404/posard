"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import { InventoryStatsBar } from "./InventoryStatsBar";
import { InventoryToolbar } from "./InventoryToolbar";
import { ProductDataTable } from "./ProductDataTable";
import { InventoryPagination } from "./InventoryPagination";
import { ProductFormSheet } from "./ProductFormSheet";
import { CategoryManagerSheet } from "./CategoryManagerSheet";
import { CsvUploadDialog } from "./CsvUploadDialog";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";

import { findAllProducts } from "@/app/(protected)/inventory/_actions/product.actions";
import { deleteProduct } from "@/app/(protected)/inventory/_actions/product.actions";
import { findAllCategoriesByCompany } from "@/app/(protected)/inventory/_actions/category.actions";
import type {
  ProductDto,
  PageResponse,
} from "@/app/(protected)/inventory/_services/_dto/product.dto";
import type { CategoryDto } from "@/app/(protected)/inventory/_services/_dto/category.dto";

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

// ─────────────────────────────────────────────
// Props iniciales del servidor
// ─────────────────────────────────────────────

interface InventoryPageClientProps {
  initialProducts: PageResponse<ProductDto>;
  initialCategories: CategoryDto[];
}

// ─────────────────────────────────────────────
// Componente orquestador principal del inventario
// ─────────────────────────────────────────────

export function InventoryPageClient({
  initialProducts,
  initialCategories,
}: InventoryPageClientProps) {
  // Estado de la lista de productos paginada
  const [pageData, setPageData] =
    useState<PageResponse<ProductDto>>(initialProducts);
  const [categories, setCategories] =
    useState<CategoryDto[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros y paginación
  const [keyword, setKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Estados de los paneles/modales
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<ProductDto | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Referencia para el debounce del campo de búsqueda
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────
  // Función de recarga de productos desde el servidor
  // ─────────────────────────────────────────────

  const fetchProducts = useCallback(
    async (params?: {
      keyword?: string;
      categoryId?: string | null;
      page?: number;
      size?: number;
    }) => {
      setIsLoading(true);
      try {
        const result = await findAllProducts({
          keyword: params?.keyword || undefined,
          categoryId: params?.categoryId ?? undefined,
          page: params?.page ?? 0,
          size: params?.size ?? pageSize,
        });
        setPageData(result);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  // ─────────────────────────────────────────────
  // Búsqueda con debounce (300ms)
  // ─────────────────────────────────────────────

  function handleKeywordChange(value: string) {
    setKeyword(value);
    setPage(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchProducts({
        keyword: value,
        categoryId: selectedCategoryId,
        page: 0,
        size: pageSize,
      });
    }, 300);
  }

  // ─────────────────────────────────────────────
  // Filtro por categoría
  // ─────────────────────────────────────────────

  function handleCategoryChange(categoryId: string | null) {
    setSelectedCategoryId(categoryId);
    setPage(0);
    fetchProducts({
      keyword,
      categoryId,
      page: 0,
      size: pageSize,
    });
  }

  // ─────────────────────────────────────────────
  // Cambio de página
  // ─────────────────────────────────────────────

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchProducts({
      keyword,
      categoryId: selectedCategoryId,
      page: newPage,
      size: pageSize,
    });
  }

  // ─────────────────────────────────────────────
  // Cambio de tamaño de página
  // ─────────────────────────────────────────────

  function handleSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(0);
    fetchProducts({
      keyword,
      categoryId: selectedCategoryId,
      page: 0,
      size: newSize,
    });
  }

  // ─────────────────────────────────────────────
  // Acciones de producto
  // ─────────────────────────────────────────────

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
    refreshAll();
  }

  // ─────────────────────────────────────────────
  // Refrescar tanto productos como categorías
  // ─────────────────────────────────────────────

  async function refreshAll() {
    const [_, cats] = await Promise.all([
      fetchProducts({
        keyword,
        categoryId: selectedCategoryId,
        page,
        size: pageSize,
      }),
      findAllCategoriesByCompany(),
    ]);
    setCategories(cats);
  }

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas de resumen */}
      <InventoryStatsBar
        products={pageData.content}
        totalElements={pageData.totalElements}
        categories={categories}
      />

      {/* Barra de herramientas */}
      <InventoryToolbar
        keyword={keyword}
        onKeywordChange={handleKeywordChange}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={handleCategoryChange}
        onAddProduct={handleAddProduct}
        onBulkUpload={() => setCsvDialogOpen(true)}
        onManageCategories={() => setCategorySheetOpen(true)}
      />

      {/* Tabla de productos */}
      <ProductDataTable
        products={pageData.content}
        isLoading={isLoading}
        onEdit={handleEditProduct}
        onAdjustStock={handleAdjustStock}
        onDelete={handleDeleteProduct}
      />

      {/* Paginación */}
      <InventoryPagination
        page={pageData.page}
        totalPages={pageData.totalPages}
        totalElements={pageData.totalElements}
        hasNext={pageData.hasNext}
        hasPrevious={pageData.hasPrevious}
        size={pageData.size}
        onPageChange={handlePageChange}
        onSizeChange={handleSizeChange}
      />

      {/* Panel de crear/editar producto */}
      <ProductFormSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        product={editingProduct}
        categories={categories}
        onSuccess={refreshAll}
      />

      {/* Panel de gestión de categorías */}
      <CategoryManagerSheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        categories={categories}
        onCategoriesUpdated={setCategories}
      />

      {/* Diálogo de carga CSV */}
      <CsvUploadDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        onSuccess={refreshAll}
      />

      {/* Diálogo de ajuste de stock */}
      <StockAdjustmentDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        product={stockProduct}
        onSuccess={refreshAll}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog
        open={deletingProduct !== null}
        onOpenChange={(o) => !o && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deletingProduct?.name}
              </span>
              ? This action is a soft delete and can be reversed by an
              administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
