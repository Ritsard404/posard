"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

import {
  createProduct,
  updateProduct,
} from "@/app/(protected)/product/_actions/product.actions";
import type { ProductDto } from "@/app/(protected)/product/_services/_dto/product.dto";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

// ─────────────────────────────────────────────
// Esquema de validación con Zod (strings para campos numéricos,
// se convierten a números al enviar)
// ─────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  barcode: z.string().optional(),
  baseUnit: z.string().optional(),
  quantity: z.string().optional(),
  cost: z.string().optional(),
  price: z.string().min(1, "Price is required."),
  isAvailable: z.boolean().optional(),
  itemType: z.enum(["RESALE", "WHOLESALE"]).optional(),
  vatType: z.enum(["VATABLE", "EXEMPT", "ZERO"]).optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─────────────────────────────────────────────
// Props del formulario de producto
// ─────────────────────────────────────────────

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDto | null;
  categories: CategoryDto[];
  onSuccess: () => void;
}

// ─────────────────────────────────────────────
// Panel lateral para crear/editar productos
// ─────────────────────────────────────────────

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
}: ProductFormSheetProps) {
  const isEditing = product !== null;
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      baseUnit: "UNIT",
      quantity: "0",
      cost: "0",
      price: "",
      isAvailable: true,
      itemType: "RESALE",
      vatType: "VATABLE",
      categoryId: "",
      categoryName: "",
    },
  });

  // Rellenar el formulario cuando se abre con un producto existente
  useEffect(() => {
    if (open && product) {
      reset({
        name: product.name,
        barcode: product.barcode ?? "",
        baseUnit: product.baseUnit ?? "UNIT",
        quantity: String(product.quantity ?? 0),
        cost: String(product.cost ?? 0),
        price: String(product.price),
        isAvailable: product.isAvailable,
        itemType: product.itemType,
        vatType: product.vatType,
        categoryId: product.categoryId ?? "",
        categoryName: "",
      });
    } else if (open) {
      reset({
        name: "",
        barcode: "",
        baseUnit: "UNIT",
        quantity: "0",
        cost: "0",
        price: "",
        isAvailable: true,
        itemType: "RESALE",
        vatType: "VATABLE",
        categoryId: "",
        categoryName: "",
      });
    }
    setServerError(null);
  }, [open, product, reset]);

  const isAvailableValue = watch("isAvailable");

  // Convertir strings a números y enviar al servidor
  async function onSubmit(values: ProductFormValues) {
    setServerError(null);

    const priceNum = parseFloat(values.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setServerError("Price must be a valid positive number.");
      return;
    }

    const dto = {
      name: values.name,
      barcode: values.barcode || undefined,
      baseUnit: values.baseUnit || "UNIT",
      quantity: values.quantity ? parseFloat(values.quantity) : undefined,
      cost: values.cost ? parseFloat(values.cost) : undefined,
      price: priceNum,
      isAvailable: values.isAvailable,
      itemType: values.itemType,
      vatType: values.vatType,
      categoryId: values.categoryId || undefined,
      categoryName: values.categoryName || undefined,
    };

    const result = isEditing
      ? await updateProduct(product!.id, dto)
      : await createProduct(dto);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    onOpenChange(false);
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Product" : "New Product"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the product fields below."
              : "Fill in the details to create a new product."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-5 px-4 py-2"
        >
          {/* Error del servidor */}
          {serverError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Name *</Label>
            <Input
              id="product-name"
              placeholder="e.g. Bottled Water 500ml"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <Label htmlFor="product-category">Category</Label>
            <select
              id="product-category"
              {...register("categoryId")}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Precio y Costo en una fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("price")}
              />
              {errors.price && (
                <p className="text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-cost">Cost</Label>
              <Input
                id="product-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("cost")}
              />
            </div>
          </div>

          {/* Cantidad y Unidad base */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-quantity">Quantity</Label>
              <Input
                id="product-quantity"
                type="number"
                min="0"
                placeholder="0"
                {...register("quantity")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-base-unit">Base Unit</Label>
              <Input
                id="product-base-unit"
                placeholder="UNIT"
                {...register("baseUnit")}
              />
            </div>
          </div>

          {/* Código de barras */}
          <div className="space-y-1.5">
            <Label htmlFor="product-barcode">Barcode</Label>
            <Input
              id="product-barcode"
              placeholder="Optional barcode"
              {...register("barcode")}
            />
          </div>

          {/* Tipo de artículo y IVA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-item-type">Item Type</Label>
              <select
                id="product-item-type"
                {...register("itemType")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="RESALE">Resale</option>
                <option value="WHOLESALE">Wholesale</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-vat-type">VAT Type</Label>
              <select
                id="product-vat-type"
                {...register("vatType")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="VATABLE">Vatable</option>
                <option value="EXEMPT">Exempt</option>
                <option value="ZERO">Zero-rated</option>
              </select>
            </div>
          </div>

          {/* Disponible */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="product-available"
              checked={isAvailableValue}
              onCheckedChange={(checked) =>
                setValue("isAvailable", checked === true)
              }
            />
            <Label htmlFor="product-available" className="cursor-pointer">
              Available for sale
            </Label>
          </div>

          {/* Botones */}
          <SheetFooter className="mt-auto px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
