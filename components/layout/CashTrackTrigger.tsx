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
      <Button variant="outline" size="sm" onClick={handleOpen} className="hidden h-9 shrink-0 rounded-lg border-emerald-200 bg-emerald-50 px-2.5 text-emerald-700 hover:bg-emerald-100 md:flex">
        <Coins className="mr-1.5 h-4 w-4 text-emerald-600" />
        <span className="hidden lg:inline">Cash Track</span>
        <span className="lg:hidden">Cash</span>
      </Button>
      <Button variant="outline" size="icon" onClick={handleOpen} className="size-9 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 md:hidden">
        <Coins className="w-4 h-4" />
        <span className="sr-only">Cash Track</span>
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
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="mt-4 text-sm text-muted-foreground">Calculating session totals...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : data ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Opening Cash</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{formatMoney(data.openingCash)}</p>
                </div>
                <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Cash Sales (+)</p>
                  <p className="text-xl font-bold text-sky-600 mt-1">{formatMoney(data.totalCashSales)}</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Withdrawals (-)</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{formatMoney(data.totalWithdrawals)}</p>
                  <p className="text-[10px] text-amber-600/70 mt-0.5">Txns: {data.withdrawnCount}</p>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">E-Payments</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">{formatMoney(data.totalEPaymentSales)}</p>
                  <p className="text-[10px] text-purple-600/70 mt-0.5">(Reference only)</p>
                </div>
              </div>

              <div className="bg-emerald-600 p-5 rounded-xl text-white shadow-lg shadow-emerald-200/50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Expected in Drawer</p>
                    <p className="text-xs text-emerald-200/80 mt-0.5">Opening + Cash Sales - Withdrawals</p>
                  </div>
                  <p className="text-3xl font-black">
                    {formatMoney(data.expectedDrawerAmount)}
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-2 mt-6 border-t pt-4 text-muted-foreground/80">
                <div className="flex justify-between">
                  <span>Terminal:</span>
                  <span className="font-semibold text-foreground">{data.terminalName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span className="font-semibold text-foreground">{data.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Started At:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(data.timestampIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No active session found</div>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
