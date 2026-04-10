"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { withdrawCashAction, getAvailableCashAction } from "../_actions/session.action";
import { toast } from "sonner";
import { useEffect } from "react";

interface WithdrawModalProps {
  timestampId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WithdrawModal({ timestampId, onSuccess, onCancel }: WithdrawModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCash, setAvailableCash] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAvailable() {
      const res = await getAvailableCashAction(timestampId);
      if (res.success) {
        setAvailableCash(res.availableCash ?? null);
      }
    }
    fetchAvailable();
  }, [timestampId]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (amount <= 0) {
      setError("Withdrawal amount must be greater than 0");
      return;
    }

    if (pin.length < 4) {
      setError("Manager PIN is required (min 4 digits)");
      return;
    }

    setIsLoading(true);
    const result = await withdrawCashAction(timestampId, amount, pin);
    setIsLoading(false);

    if (result.success) {
      toast.success("Cash withdrawn successfully");
      onSuccess();
    } else {
      setError(result.error || "Failed to withdraw cash.");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-white/5 glass-card backdrop-blur-3xl animate-in zoom-in-95 duration-500 shadow-2xl shadow-amber-900/10">
        <div className="bg-amber-500/10 p-8 text-center flex flex-col items-center border-b border-white/5 relative">
          <div className="absolute top-0 -left-10 size-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="size-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6">
            <Wallet className="h-8 w-8 text-amber-500" />
          </div>
          <DialogHeader className="p-0">
            <DialogTitle className="text-3xl font-heading font-black tracking-tight text-amber-500">Withdraw Cash</DialogTitle>
            <DialogDescription className="text-muted-foreground/60 font-medium uppercase tracking-[0.1em] text-[10px] mt-2 font-bold">
              Adjusting physical register balances
              {availableCash !== null && (
                <span className="block mt-1 text-amber-500/80">
                  Available: ₱{availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleWithdraw} className="flex flex-col space-y-8 p-8 relative">
          <div className="space-y-4">
            <Label htmlFor="amount" className="font-black uppercase text-[10px] text-muted-foreground/40 tracking-[0.25em] ml-1">Withdrawal Amount</Label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500/50 group-focus-within:text-amber-500 transition-colors font-black font-heading text-xl">₱</span>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                placeholder="0.00"
                className="pl-12 pr-6 text-4xl h-20 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-heading font-black tracking-tighter"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <Label htmlFor="pin" className="font-black uppercase text-[10px] text-muted-foreground/40 tracking-[0.25em] ml-1">Manager Signature (PIN)</Label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500/50 group-focus-within:text-amber-500 transition-colors font-black font-heading text-xl">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <Input
                id="pin"
                type="password"
                maxLength={6}
                inputMode="numeric"
                placeholder="••••••"
                className="pl-12 pr-6 text-2xl h-16 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-heading font-black tracking-widest text-center"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          {error && (
            <div className="animate-in slide-in-from-top-2 flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest">
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground/40 hover:bg-white/5 hover:text-muted-foreground transition-all" onClick={onCancel} disabled={isLoading}>
              Close Window
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-14 rounded-2xl bg-amber-600 text-white font-heading font-black text-lg uppercase tracking-widest glow-on-hover shadow-2xl shadow-amber-600/20 hover:bg-amber-500 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3" 
              disabled={isLoading || amount <= 0 || pin.length < 4}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Wait...
                </>
              ) : (
                <>
                  Withdraw
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Ensure icons are imported
import { Wallet, ArrowRight, ShieldCheck } from "lucide-react";
