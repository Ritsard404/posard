"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { returnInvoiceAction } from "@/app/(protected)/pos/_actions/order.action";
import type { TransactionHistoryItemDto } from "../_services/_dto/report.dto";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

const commonReasons = [
  "Wrong item",
  "Damaged item",
  "Customer changed mind",
  "Incorrect quantity",
  "Price correction",
];

export function ReturnInvoiceDialog({ invoice }: { invoice: TransactionHistoryItemDto }) {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedItems = useMemo(
    () =>
      invoice.items
        .map((item) => ({
          invoiceItemId: item.itemId,
          quantity: quantities[item.itemId] ?? 0,
        }))
        .filter((item) => item.quantity > 0),
    [invoice.items, quantities],
  );
  const selectedTotal = invoice.items.reduce((sum, item) => {
    const qty = quantities[item.itemId] ?? 0;
    const unit = item.quantity > 0 ? item.subtotal / item.quantity : 0;
    return sum + qty * unit;
  }, 0);

  function setFullReturn() {
    setQuantities(
      Object.fromEntries(
        invoice.items
          .filter((item) => item.returnableQuantity > 0)
          .map((item) => [item.itemId, item.returnableQuantity]),
      ),
    );
  }

  function clearReturn() {
    setQuantities({});
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await returnInvoiceAction({
        invoiceId: invoice.invoiceId,
        items: selectedItems,
        reason,
        notes,
        managerPin,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Return R-${result.data.returnNumber} recorded.`);
      setOpen(false);
    });
  }

  const canSubmit = selectedItems.length > 0 && reason.trim().length > 0 && managerPin.trim().length > 0;
  const returnableItems = invoice.items.filter((item) => item.returnableQuantity > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="rounded-lg">
          <RotateCcw className="size-4" />
          Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return Invoice #{invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Select returned quantities, confirm the refund total, and capture manager approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Customer</div>
              <div>{invoice.customerName || "Walk-in"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Terminal</div>
              <div>{invoice.terminalName}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Invoice Total</div>
              <div>{formatCurrency(invoice.totalAmount)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Already Returned</div>
              <div>{formatCurrency(invoice.returnedAmount)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Return Items</Label>
                <div className="text-xs text-muted-foreground">
                  {returnableItems.length} item{returnableItems.length === 1 ? "" : "s"} still returnable.
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={clearReturn}>
                  Clear
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={setFullReturn}>
                  Full Remaining
                </Button>
              </div>
            </div>
            {invoice.items.map((item) => (
              <div key={item.itemId} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_120px]">
                <div className="min-w-0">
                  <div className="font-semibold">{item.itemName}</div>
                  <div className="text-xs text-muted-foreground">
                    Sold {item.quantity} / Returned {item.returnedQuantity} / Available {item.returnableQuantity}
                  </div>
                  <div className="mt-1 text-xs font-semibold">
                    Refund line: {formatCurrency((quantities[item.itemId] ?? 0) * (item.quantity > 0 ? item.subtotal / item.quantity : 0))}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={item.returnableQuantity}
                  step="0.01"
                  disabled={item.returnableQuantity <= 0}
                  value={quantities[item.itemId] ?? 0}
                  onChange={(event) => {
                    const value = Math.min(
                      item.returnableQuantity,
                      Math.max(0, Number(event.target.value) || 0),
                    );
                    setQuantities((current) => ({ ...current, [item.itemId]: value }));
                  }}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="return-reason">Reason</Label>
              <select
                id="return-reason"
                value={commonReasons.includes(reason) ? reason : ""}
                onChange={(event) => setReason(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select reason</option>
                {commonReasons.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <Input
                value={commonReasons.includes(reason) ? "" : reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Or enter custom reason"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-pin">Manager PIN</Label>
              <Input
                id="return-pin"
                type="password"
                value={managerPin}
                onChange={(event) => setManagerPin(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="return-notes">Notes</Label>
              <Input id="return-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <div className="mr-auto text-sm">
            <div className="font-semibold">Refund total: {formatCurrency(selectedTotal)}</div>
            <div className="text-xs text-muted-foreground">{selectedItems.length} selected line item{selectedItems.length === 1 ? "" : "s"}</div>
          </div>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
