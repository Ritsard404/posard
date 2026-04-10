"use client";

import { useState, useEffect } from "react";
import { usePOSStore } from "@/app/(protected)/pos/_store/pos-store";
import { getSessionCashTrackAction } from "@/app/(protected)/pos/_actions/session.action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Coins } from "lucide-react";
import { Decimal } from "@prisma/client/runtime/client";

export function CashTrackTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);

  // If there's no active POS session detected in the client, we hide the button entirely.
  // Because it's injected in the global layout, this allows cash tracking as long as they
  // have a POS session active in this browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !activeTimestampId) return null;

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    const res = await getSessionCashTrackAction(activeTimestampId);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error || "Failed to load cash track.");
    }
    setLoading(false);
  };

  const formatMoney = (val: string | number | Decimal | undefined | null) => {
    if (val === undefined || val === null) return "₱0.00";
    return `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="hidden md:flex bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200">
        <Coins className="w-4 h-4 mr-2 text-emerald-600" />
        Cash Track
      </Button>
      <Button variant="outline" size="icon" onClick={handleOpen} className="md:hidden bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200">
        <Coins className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Session Cash Track
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Loading audit data...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : data ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Opening Cash</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(data.cashInDrawerAmount)}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Cash Withdrawn</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{formatMoney(data.withdrawnDrawerAmount)}</p>
                  <p className="text-xs text-muted-foreground mt-1 text-right">Transactions: {Number(data.withdrawnDrawerCount)}</p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expected Drawer Amount</p>
                  <p className="text-xs text-muted-foreground">Opening - Withdrawn (Sales pending update)</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatMoney(Number(data.cashInDrawerAmount) - Number(data.withdrawnDrawerAmount))}
                </p>
              </div>

              <div className="text-sm space-y-1 mt-6 border-t pt-4 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Terminal:</span>
                  <span className="font-medium text-foreground">{data.posTerminal?.posName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Logged in by:</span>
                  <span className="font-medium text-foreground">{data.cashier?.fullName || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Started:</span>
                  <span className="font-medium text-foreground">
                    {new Date(data.timestampIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">No active session found</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
