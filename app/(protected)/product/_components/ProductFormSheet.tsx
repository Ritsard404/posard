"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Package2, SlidersHorizontal, Tags, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  createProduct,
  updateProduct,
} from "@/app/(protected)/product/_actions/product.actions";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";
import type { ProductDto } from "@/app/(protected)/product/_services/_dto/product.dto";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { deletePosardImageAction } from "@/lib/storage/image-storage.actions";

const productSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required."),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    barcode: z.string().optional(),
    genericName: z.string().optional(),
    brandName: z.string().optional(),
    shelfLocation: z.string().optional(),
    preferredSupplierName: z.string().optional(),
    prescriptionRequired: z.boolean(),
    posFavorite: z.boolean(),
    reorderPoint: z.string().optional(),
    baseUnit: z.string().trim().optional(),
    quantity: z.string().optional(),
    cost: z.string().optional(),
    price: z.string().min(1, "Price is required."),
    itemType: z.enum(["RESALE", "WHOLESALE"]),
    vatType: z.enum(["VATABLE", "EXEMPT", "ZERO"]),
    isAvailable: z.boolean(),
    trackInventory: z.boolean(),
    trackingMode: z.enum(["STANDARD", "SERVICE", "NON_STOCK", "VARIANT_PARENT", "SERIALIZED", "BUNDLE"]),
    serviceDurationMinutes: z.string().optional(),
    warrantyDays: z.string().optional(),
    productImageUrl: z.string().nullable().optional(),
    isConfigurable: z.boolean(),
    configurationMode: z.enum(["RETAIL", "RESTAURANT", "HYBRID"]).nullable(),
    modifierGroupsJson: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const price = Number(value.price);
    if (!Number.isFinite(price) || price < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Price must be zero or greater.",
      });
    }

    if (value.cost) {
      const cost = Number(value.cost);
      if (!Number.isFinite(cost) || cost < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cost"],
          message: "Cost must be zero or greater.",
        });
      }
    }

    if (value.trackInventory && value.quantity) {
      const quantity = Number(value.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Quantity must be zero or greater.",
        });
      }
    }

    if (value.serviceDurationMinutes) {
      const duration = Number(value.serviceDurationMinutes);
      if (!Number.isFinite(duration) || duration < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["serviceDurationMinutes"],
          message: "Service duration must be zero or greater.",
        });
      }
    }

    if (value.warrantyDays) {
      const warrantyDays = Number(value.warrantyDays);
      if (!Number.isFinite(warrantyDays) || warrantyDays < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["warrantyDays"],
          message: "Warranty days must be zero or greater.",
        });
      }
    }

    if (value.reorderPoint) {
      const reorderPoint = Number(value.reorderPoint);
      if (!Number.isFinite(reorderPoint) || reorderPoint < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reorderPoint"],
          message: "Reorder point must be zero or greater.",
        });
      }
    }

    if (value.isConfigurable && value.modifierGroupsJson?.trim()) {
      try {
        const parsed = JSON.parse(value.modifierGroupsJson);
        if (!Array.isArray(parsed)) {
          throw new Error("Configuration must be an array.");
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modifierGroupsJson"],
          message: "Use valid JSON for modifier groups.",
        });
      }
    }
  });

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDto | null;
  categories: CategoryDto[];
  onSuccess: () => void;
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-medium leading-none">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
}: ProductFormSheetProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = product !== null;

  const defaultValues = useMemo<ProductFormValues>(
    () => ({
      name: "",
      categoryId: "",
      categoryName: "",
      barcode: "",
      genericName: "",
      brandName: "",
      shelfLocation: "",
      preferredSupplierName: "",
      prescriptionRequired: false,
      posFavorite: false,
      reorderPoint: "",
      baseUnit: "UNIT",
      quantity: "",
      cost: "0",
      price: "",
      itemType: "RESALE",
      vatType: "VATABLE",
      isAvailable: true,
      trackInventory: false,
      trackingMode: "STANDARD",
      serviceDurationMinutes: "",
      warrantyDays: "",
      productImageUrl: null,
      isConfigurable: false,
      configurationMode: null,
      modifierGroupsJson: "",
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const trackInventory = watch("trackInventory");
  const trackingMode = watch("trackingMode");
  const isAvailable = watch("isAvailable");
  const isConfigurable = watch("isConfigurable");
  const selectedCategoryId = watch("categoryId");
  const watchedPrice = watch("price");
  const watchedCost = watch("cost");
  const markupPercent = useMemo(() => {
    const price = Number(watchedPrice);
    const cost = Number(watchedCost);

    if (!Number.isFinite(price) || !Number.isFinite(cost) || cost <= 0) {
      return null;
    }

    return Math.round(((price - cost) / cost) * 10000) / 100;
  }, [watchedCost, watchedPrice]);

  useEffect(() => {
    if (!open) return;

    if (product) {
      reset({
        name: product.name,
        categoryId: product.categoryId,
        categoryName: "",
        barcode: product.barcode ?? "",
        genericName: product.genericName ?? "",
        brandName: product.brandName ?? "",
        shelfLocation: product.shelfLocation ?? "",
        preferredSupplierName: product.preferredSupplierName ?? "",
        prescriptionRequired: product.prescriptionRequired,
        posFavorite: product.posFavorite,
        reorderPoint: product.reorderPoint === null ? "" : String(product.reorderPoint),
        baseUnit: product.baseUnit || "UNIT",
        quantity: product.trackInventory ? String(product.quantity ?? 0) : "",
        cost: String(product.cost ?? 0),
        price: String(product.price),
        itemType: product.itemType,
        vatType: product.vatType,
        isAvailable: product.isAvailable,
        trackInventory: product.trackInventory,
        trackingMode: product.trackingMode,
        serviceDurationMinutes: product.serviceDurationMinutes === null ? "" : String(product.serviceDurationMinutes),
        warrantyDays: product.warrantyDays === null ? "" : String(product.warrantyDays),
        productImageUrl: product.productImageUrl ?? null,
        isConfigurable: product.isConfigurable,
        configurationMode: product.configurationMode,
        modifierGroupsJson: JSON.stringify(
          product.modifierGroups.map((group) => ({
            id: group.id,
            name: group.name,
            type: group.type,
            required: group.required,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            options: group.options.map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta,
              isDefault: option.isDefault,
            })),
          })),
          null,
          2,
        ),
      });
    } else {
      reset(defaultValues);
    }

    setServerError(null);
  }, [defaultValues, open, product, reset]);

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);

    const dto = {
      name: values.name.trim(),
      categoryId: values.categoryId?.trim() || undefined,
      categoryName: values.categoryName?.trim() || undefined,
      barcode: values.barcode?.trim() || undefined,
      genericName: values.genericName?.trim() || undefined,
      brandName: values.brandName?.trim() || undefined,
      shelfLocation: values.shelfLocation?.trim() || undefined,
      preferredSupplierName: values.preferredSupplierName?.trim() || undefined,
      prescriptionRequired: values.prescriptionRequired,
      posFavorite: values.posFavorite,
      reorderPoint: values.reorderPoint?.trim() ? Number(values.reorderPoint) : null,
      baseUnit: values.baseUnit?.trim() || "UNIT",
      quantity: values.trackInventory ? (values.quantity?.trim() ? Number(values.quantity) : 0) : null,
      cost: values.cost?.trim() ? Number(values.cost) : 0,
      price: Number(values.price),
      itemType: values.itemType,
      vatType: values.vatType,
      isAvailable: values.isAvailable,
      trackInventory: values.trackInventory,
      trackingMode: values.trackingMode,
      serviceDurationMinutes: values.serviceDurationMinutes?.trim()
        ? Number(values.serviceDurationMinutes)
        : null,
      warrantyDays: values.warrantyDays?.trim() ? Number(values.warrantyDays) : null,
      productImageUrl: values.productImageUrl?.trim() || undefined,
      isConfigurable: values.isConfigurable,
      configurationMode: values.configurationMode,
      modifierGroups: values.isConfigurable && values.modifierGroupsJson?.trim()
        ? JSON.parse(values.modifierGroupsJson)
        : [],
    };

    const result = isEditing
      ? await updateProduct(product.id, dto)
      : await createProduct(dto);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    if (product?.productImageUrl && product.productImageUrl !== dto.productImageUrl) {
      await deletePosardImageAction(product.productImageUrl);
    }

    onOpenChange(false);
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="px-1">
          <SheetTitle>{isEditing ? "Edit Product" : "New Product"}</SheetTitle>
          <SheetDescription>
            Capture pricing, inventory, and tax settings in one place. Inventory-off products are saved with `quantity = null`.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-6 px-1 pb-6">
          {serverError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          ) : null}

          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <SectionHeader
              icon={<Tags className="size-4 text-primary" />}
              title="Core details"
              description="Name, category, barcode, and image metadata."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input id="product-name" placeholder="Bottled Water 500ml" {...register("name")} />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-category">Existing Category</Label>
                <select
                  id="product-category"
                  {...register("categoryId")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {selectedCategoryId ? "Using the selected existing category." : "Leave blank if you want to create a new category below."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-category-name">New Category Name</Label>
                <Input
                  id="product-category-name"
                  placeholder="Optional new category"
                  {...register("categoryName")}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, the service will resolve or create this category.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-barcode">Barcode</Label>
                <Input id="product-barcode" placeholder="Optional barcode" {...register("barcode")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-generic-name">Generic Name</Label>
                <Input id="product-generic-name" placeholder="Paracetamol" {...register("genericName")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-brand-name">Brand Name</Label>
                <Input id="product-brand-name" placeholder="Biogesic" {...register("brandName")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-preferred-supplier">Preferred Supplier</Label>
                <Input
                  id="product-preferred-supplier"
                  placeholder="Existing active supplier name"
                  {...register("preferredSupplierName")}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if this product does not have a preferred supplier yet.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <input type="hidden" {...register("productImageUrl")} />
                <ImageUploadField
                  id="product-image-url"
                  label="Product Image"
                  purpose="product"
                  ownerId={product?.id ?? null}
                  value={watch("productImageUrl")}
                  disabled={isSubmitting}
                  onChange={(value) => {
                    setValue("productImageUrl", value, { shouldDirty: true, shouldValidate: true });
                  }}
                  description="Upload a clear product photo. POSard optimizes it before saving."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <SectionHeader
              icon={<SlidersHorizontal className="size-4 text-sky-600" />}
              title="Product configuration"
              description="Optional variants, modifiers, add-ons, and notes for restaurant or hybrid items."
            />

            <div className="space-y-3 rounded-xl border border-border/70 bg-background px-3 py-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="product-configurable"
                  checked={isConfigurable}
                  onCheckedChange={(checked) => setValue("isConfigurable", checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="product-configurable" className="cursor-pointer">
                    Configurable item
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Opens a compact POS configuration dialog before adding this product.
                  </p>
                </div>
              </div>

              {isConfigurable ? (
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="configuration-mode">Applies to</Label>
                    <select
                      id="configuration-mode"
                      {...register("configurationMode")}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                    >
                      <option value="">Both / inherited</option>
                      <option value="RETAIL">Retail only</option>
                      <option value="RESTAURANT">Restaurant only</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modifier-groups-json">Modifier Groups JSON</Label>
                    <textarea
                      id="modifier-groups-json"
                      {...register("modifierGroupsJson")}
                      className="min-h-44 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-ring"
                      placeholder='[{"name":"Size","type":"VARIANT","required":true,"minSelect":1,"maxSelect":1,"options":[{"name":"Large","priceDelta":20}]}]'
                    />
                    {errors.modifierGroupsJson ? (
                      <p className="text-xs text-destructive">{errors.modifierGroupsJson.message}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <SectionHeader
              icon={<Wallet className="size-4 text-emerald-600" />}
              title="Pricing and tax"
              description="Set pricing, cost baseline, item classification, and VAT handling."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="product-price">Price</Label>
                <Input id="product-price" type="number" min="0" step="0.01" placeholder="0.00" {...register("price")} />
                {errors.price ? <p className="text-xs text-destructive">{errors.price.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-cost">Cost</Label>
                <Input id="product-cost" type="number" min="0" step="0.01" placeholder="0.00" {...register("cost")} />
                {errors.cost ? <p className="text-xs text-destructive">{errors.cost.message}</p> : null}
              </div>

              <div className="sm:col-span-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Markup</span>
                  <span className="font-semibold tabular-nums">
                    {markupPercent === null ? "Set cost to calculate" : `${markupPercent.toFixed(2)}%`}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-item-type">Item Type</Label>
                <select
                  id="product-item-type"
                  {...register("itemType")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
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
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                >
                  <option value="VATABLE">Vatable</option>
                  <option value="EXEMPT">Exempt</option>
                  <option value="ZERO">Zero-rated</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <SectionHeader
              icon={<Package2 className="size-4 text-amber-600" />}
              title="Inventory behavior"
              description="Use quantity only when inventory tracking is enabled."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="product-base-unit">Base Unit</Label>
                <Input id="product-base-unit" placeholder="UNIT" {...register("baseUnit")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-tracking-mode">Tracking Mode</Label>
                <select
                  id="product-tracking-mode"
                  {...register("trackingMode")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  onChange={(event) => {
                    const nextMode = event.currentTarget.value as ProductFormValues["trackingMode"];
                    setValue("trackingMode", nextMode, { shouldDirty: true, shouldValidate: true });
                    if (nextMode === "SERVICE" || nextMode === "NON_STOCK") {
                      setValue("trackInventory", false, { shouldDirty: true, shouldValidate: true });
                      setValue("quantity", "", { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                >
                  <option value="STANDARD">Standard product</option>
                  <option value="SERVICE">Service fee</option>
                  <option value="NON_STOCK">Non-stock item</option>
                  <option value="VARIANT_PARENT">Variant parent</option>
                  <option value="SERIALIZED">Serialized item</option>
                  <option value="BUNDLE">Bundle or kit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-quantity">Quantity</Label>
                <Input
                  id="product-quantity"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder={trackInventory ? "0" : "Disabled while inventory is off"}
                  disabled={!trackInventory}
                  {...register("quantity")}
                />
                {errors.quantity ? <p className="text-xs text-destructive">{errors.quantity.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-reorder-point">Reorder Point</Label>
                <Input
                  id="product-reorder-point"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="Default threshold"
                  {...register("reorderPoint")}
                />
                {errors.reorderPoint ? <p className="text-xs text-destructive">{errors.reorderPoint.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-shelf-location">Shelf Location</Label>
                <Input id="product-shelf-location" placeholder="A1 / Cabinet 2" {...register("shelfLocation")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-service-duration">Service Duration Minutes</Label>
                <Input
                  id="product-service-duration"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  {...register("serviceDurationMinutes")}
                />
                {errors.serviceDurationMinutes ? (
                  <p className="text-xs text-destructive">{errors.serviceDurationMinutes.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-warranty-days">Warranty Days</Label>
                <Input
                  id="product-warranty-days"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  {...register("warrantyDays")}
                />
                {errors.warrantyDays ? (
                  <p className="text-xs text-destructive">{errors.warrantyDays.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 bg-background px-3 py-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="product-track-inventory"
                  checked={trackInventory}
                  disabled={trackingMode === "SERVICE" || trackingMode === "NON_STOCK"}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setValue("trackInventory", next);
                    if (!next) {
                      setValue("quantity", "");
                    }
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="product-track-inventory" className="cursor-pointer">
                    Track inventory
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Turn this on for packaged or counted products. Service and non-stock items keep inventory off.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="product-prescription-required"
                  checked={watch("prescriptionRequired")}
                  onCheckedChange={(checked) => setValue("prescriptionRequired", checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="product-prescription-required" className="cursor-pointer">
                    Prescription required
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show POS warnings for products that need a prescription check before selling.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="product-pos-favorite"
                  checked={watch("posFavorite")}
                  onCheckedChange={(checked) => setValue("posFavorite", checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="product-pos-favorite" className="cursor-pointer">
                    POS favorite
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Pin this product near the top of POS results before frequent recent sellers.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="product-available"
                  checked={isAvailable}
                  onCheckedChange={(checked) => setValue("isAvailable", checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="product-available" className="cursor-pointer">
                    Available for sale
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Disable this to keep the product in inventory but hide it from active selling workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto gap-2 px-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
