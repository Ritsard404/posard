"use client";

import { useState } from "react";
import { Loader2, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { recordInventoryTransaction } from "@/app/(protected)/product/_actions/inventory.actions";
import type { ProductDto } from "@/app/(protected)/product/_services/_dto/product.dto";
import type { InventoryTransactionType } from "@prisma/client";

// ─────────────────────────────────────────────
// Props del diálogo de ajuste de stock
// ─────────────────────────────────────────────

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDto | null;
  onSuccess: () => void;
}

const TRANSACTION_TYPES: {
  value: InventoryTransactionType;
  label: string;
  description: string;
}[] = [
  { value: "IN", label: "Stock In", description: "Add to current stock" },
  {
    value: "OUT",
    label: "Stock Out",
    description: "Remove from current stock",
  },
  {
    value: "ADJUSTMENT",
    label: "Adjustment",
    description: "Set stock to exact amount",
  },
];

// ─────────────────────────────────────────────
// Diálogo para ajustar el stock de un producto
// ─────────────────────────────────────────────

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [transactionType, setTransactionType] =
    useState<InventoryTransactionType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpiar estado al cerrar
  function handleOpenChange(next: boolean) {
    if (!next) {
      setTransactionType("IN");
      setQuantity("");
      setReference("");
      setError(null);
    }
    onOpenChange(next);
  }

  // Enviar la transacción de inventario al servidor
  async function handleSubmit() {
    if (!product) return;
    setError(null);

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }

    setIsSubmitting(true);

    const result = await recordInventoryTransaction({
      productId: product.id,
      quantity: qty,
      inventoryTransactionType: transactionType,
      reference: reference.trim() || undefined,
    });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    handleOpenChange(false);
    onSuccess();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="size-5" />
            Adjust Stock
          </AlertDialogTitle>
          <AlertDialogDescription>
            {product ? (
              <>
                <span className="font-medium text-foreground">
                  {product.name}
                </span>{" "}
                — Current stock:{" "}
                <span className="font-semibold tabular-nums">
                  {product.quantity ?? 0}
                </span>
              </>
            ) : (
              "Select a product to adjust stock."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Tipo de transacción */}
          <div className="space-y-1.5">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTransactionType(t.value)}
                  className={`rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors ${
                    transactionType === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-foreground hover:bg-muted/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {TRANSACTION_TYPES.find((t) => t.value === transactionType)
                ?.description}
            </p>
          </div>

          {/* Cantidad */}
          <div className="space-y-1.5">
            <Label htmlFor="stock-quantity">Quantity *</Label>
            <Input
              id="stock-quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Referencia */}
          <div className="space-y-1.5">
            <Label htmlFor="stock-reference">Reference (optional)</Label>
            <Input
              id="stock-reference"
              placeholder="e.g. PO-2026-001"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !quantity}
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
