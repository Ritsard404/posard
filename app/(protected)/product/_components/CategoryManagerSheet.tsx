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
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/(protected)/product/_actions/category.actions";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDto[];
  onSuccess: () => void;
}

export function CategoryManagerSheet({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: CategoryManagerSheetProps) {
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<CategoryDto | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);

    const result = await createCategory({ categoryName: newName.trim() });

    if (result.error) {
      setError(result.error);
    } else {
      setNewName("");
      onSuccess();
    }
    setIsCreating(false);
  }

  function startEditing(category: CategoryDto) {
    setEditingId(category.id);
    setEditingName(category.categoryName);
    setError(null);
  }

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
      onSuccess();
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCategory) return;
    setError(null);

    const result = await deleteCategory(deletingCategory.id);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
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
            {error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Input
                id="new-category-name"
                placeholder="New category name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleCreate()}
                disabled={isCreating}
              />
              <Button
                id="btn-create-category"
                aria-label="Create category"
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

            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {categories.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No categories yet.
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    {editingId === category.id ? (
                      <>
                        <Input
                          aria-label="Category name"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) =>
                            event.key === "Enter" && handleSaveEdit()
                          }
                          className="h-8 flex-1 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Save ${editingName}`}
                          onClick={handleSaveEdit}
                        >
                          <Check className="size-3.5 text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Cancel category edit"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm font-medium">
                          {category.categoryName}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Edit ${category.categoryName}`}
                          onClick={() => startEditing(category)}
                          className="text-muted-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete ${category.categoryName}`}
                          onClick={() => setDeletingCategory(category)}
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

      <AlertDialog
        open={deletingCategory !== null}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
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
