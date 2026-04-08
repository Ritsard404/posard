"use client";

import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

import {
  findAllCategoriesByCompany,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/(protected)/product/_actions/category.actions";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

// ─────────────────────────────────────────────
// Props del gestor de categorías
// ─────────────────────────────────────────────

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDto[];
  onCategoriesUpdated: (categories: CategoryDto[]) => void;
}

// ─────────────────────────────────────────────
// Panel lateral para gestionar categorías (CRUD)
// ─────────────────────────────────────────────

export function CategoryManagerSheet({
  open,
  onOpenChange,
  categories,
  onCategoriesUpdated,
}: CategoryManagerSheetProps) {
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<CategoryDto | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Refrescar la lista de categorías desde el servidor
  async function refreshCategories() {
    const updated = await findAllCategoriesByCompany();
    onCategoriesUpdated(updated);
  }

  // Crear una nueva categoría
  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);

    const result = await createCategory({ categoryName: newName.trim() });

    if (result.error) {
      setError(result.error);
    } else {
      setNewName("");
      await refreshCategories();
    }
    setIsCreating(false);
  }

  // Iniciar la edición en línea
  function startEditing(cat: CategoryDto) {
    setEditingId(cat.id);
    setEditingName(cat.categoryName);
    setError(null);
  }

  // Guardar la edición
  async function handleSaveEdit() {
    if (!editingId || !editingName.trim()) return;
    setError(null);

    const result = await updateCategory(editingId, {
      categoryName: editingName.trim(),
    });

    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      setEditingName("");
      await refreshCategories();
    }
  }

  // Confirmar eliminación
  async function handleConfirmDelete() {
    if (!deletingCategory) return;
    setError(null);

    const result = await deleteCategory(deletingCategory.id);

    if (result.error) {
      setError(result.error);
    } else {
      await refreshCategories();
    }
    setDeletingCategory(null);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Manage Categories</SheetTitle>
            <SheetDescription>
              Create, rename, or remove product categories.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 py-2">
            {/* Error general */}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Campo para agregar categoría */}
            <div className="flex items-center gap-2">
              <Input
                id="new-category-name"
                placeholder="New category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                disabled={isCreating}
              />
              <Button
                id="btn-create-category"
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </Button>
            </div>

            {/* Lista de categorías */}
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {categories.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No categories yet.
                </p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    {editingId === cat.id ? (
                      <>
                        {/* Modo edición en línea */}
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveEdit()
                          }
                          className="h-8 flex-1 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleSaveEdit}
                        >
                          <Check className="size-3.5 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Modo lectura */}
                        <span className="flex-1 truncate text-sm font-medium">
                          {cat.categoryName}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEditing(cat)}
                          className="text-muted-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeletingCategory(cat)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog
        open={deletingCategory !== null}
        onOpenChange={(o) => !o && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deletingCategory?.categoryName}
              </span>
              ? This action cannot be undone. Categories with existing products
              cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
