"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product, CartItem, CartItemSelection } from "../_store/pos-store";

interface ProductConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | CartItem | null;
  mode: "add" | "edit";
  onSave: (data: {
    quantity: number;
    selections: CartItemSelection[];
    specialInstructions?: string;
    subtotal: number;
    duplicate?: boolean;
  }) => void;
  onRemove?: () => void;
}

function getInitialSelected(product: Product | CartItem | null) {
  const selected = new Set<string>();
  for (const selection of product && "selections" in product ? product.selections ?? [] : []) {
    if (selection.optionId) selected.add(selection.optionId);
  }
  return selected;
}

export function ProductConfigurationDialog({
  open,
  onOpenChange,
  product,
  mode,
  onSave,
  onRemove,
}: ProductConfigurationDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    setQuantity("cartQuantity" in product ? product.cartQuantity : 1);
    setSelectedOptions(getInitialSelected(product));
    setSpecialInstructions(
      "specialInstructions" in product ? product.specialInstructions ?? "" : "",
    );
    setError(null);
  }, [open, product]);

  const selectionRows = useMemo(() => {
    if (!product) return [];

    return product.modifierGroups.flatMap((group, groupIndex) =>
      group.options
        .filter((option) => selectedOptions.has(option.id))
        .map((option, optionIndex) => ({
          groupId: group.id,
          groupName: group.name,
          groupType: group.type,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
          quantity: 1,
          sortOrder: groupIndex * 100 + optionIndex,
        })),
    );
  }, [product, selectedOptions]);

  const optionTotal = selectionRows.reduce(
    (sum, selection) => sum + selection.priceDelta * selection.quantity,
    0,
  );
  const lineTotal = product
    ? Math.round((product.price + optionTotal) * quantity * 100) / 100
    : 0;

  const setSingleOption = (groupOptionIds: string[], optionId: string) => {
    setSelectedOptions((current) => {
      const next = new Set(current);
      groupOptionIds.forEach((id) => next.delete(id));
      next.add(optionId);
      return next;
    });
  };

  const toggleMultiOption = (optionId: string, checked: boolean) => {
    setSelectedOptions((current) => {
      const next = new Set(current);
      if (checked) next.add(optionId);
      else next.delete(optionId);
      return next;
    });
  };

  const handleSave = (duplicate = false) => {
    if (!product) return;

    for (const group of product.modifierGroups) {
      const count = group.options.filter((option) =>
        selectedOptions.has(option.id),
      ).length;
      const minimum = group.required ? Math.max(1, group.minSelect) : group.minSelect;

      if (count < minimum) {
        setError(`${group.name} requires at least ${minimum} selection${minimum === 1 ? "" : "s"}.`);
        return;
      }

      if (group.maxSelect > 0 && count > group.maxSelect) {
        setError(`${group.name} allows up to ${group.maxSelect} selection${group.maxSelect === 1 ? "" : "s"}.`);
        return;
      }
    }

    onSave({
      quantity,
      selections: selectionRows,
      specialInstructions,
      subtotal: lineTotal,
      duplicate,
    });
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3 text-left">
          <DialogTitle className="text-base">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-md border p-2">
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                onClick={() => setQuantity((value) => value + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {product.modifierGroups.map((group) => {
            const optionIds = group.options.map((option) => option.id);
            const singleSelect = group.maxSelect === 1;

            return (
              <section key={group.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-semibold">{group.name}</Label>
                  {group.required ? (
                    <span className="text-[10px] font-bold uppercase text-primary">Required</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {group.options.map((option) => {
                    const checked = selectedOptions.has(option.id);
                    return (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {singleSelect ? (
                            <input
                              type="radio"
                              name={group.id}
                              checked={checked}
                              onChange={() => setSingleOption(optionIds, option.id)}
                            />
                          ) : (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleMultiOption(option.id, value === true)
                              }
                            />
                          )}
                          <span className="truncate">{option.name}</span>
                        </span>
                        {option.priceDelta > 0 ? (
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            +{option.priceDelta.toFixed(2)}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="space-y-1.5">
            <Label htmlFor="special-instructions">Instructions</Label>
            <Input
              id="special-instructions"
              value={specialInstructions}
              onChange={(event) => setSpecialInstructions(event.target.value)}
              placeholder="No onions, less ice, separate sauce"
            />
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-3 sm:justify-between">
          <div className="mr-auto text-sm font-semibold">
            Total: PHP {lineTotal.toFixed(2)}
          </div>
          {mode === "edit" && onRemove ? (
            <Button type="button" variant="destructive" onClick={onRemove}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
          {mode === "edit" ? (
            <Button type="button" variant="outline" onClick={() => handleSave(true)}>
              Duplicate
            </Button>
          ) : null}
          <Button type="button" onClick={() => handleSave(false)}>
            {mode === "edit" ? "Update Item" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
