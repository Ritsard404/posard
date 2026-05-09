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
            Select returned quantities. Original pricing is used and over-returns are blocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border p-3 text-sm sm:grid-cols-2">
            <div>Customer: {invoice.customerName || "Walk-in"}</div>
            <div>Terminal: {invoice.terminalName}</div>
            <div>Total: {formatCurrency(invoice.totalAmount)}</div>
            <div>Returned: {formatCurrency(invoice.returnedAmount)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Return Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={setFullReturn}>
                Full Remaining
              </Button>
            </div>
            {invoice.items.map((item) => (
              <div key={item.itemId} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_120px]">
                <div className="min-w-0">
                  <div className="font-semibold">{item.itemName}</div>
                  <div className="text-xs text-muted-foreground">
                    Sold {item.quantity} / Returned {item.returnedQuantity} / Available {item.returnableQuantity}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={item.returnableQuantity}
                  step="0.01"
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
              <Input id="return-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
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
          <div className="mr-auto text-sm font-semibold">Refund total: {formatCurrency(selectedTotal)}</div>
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
