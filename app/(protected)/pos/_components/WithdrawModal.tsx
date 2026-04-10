"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { withdrawCashAction } from "../_actions/session.action";
import { toast } from "sonner";

interface WithdrawModalProps {
  timestampId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WithdrawModal({ timestampId, onSuccess, onCancel }: WithdrawModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (amount <= 0) {
      setError("Withdrawal amount must be greater than 0");
      return;
    }

    setIsLoading(true);
    const result = await withdrawCashAction(timestampId, amount);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-amber-600">Withdraw Cash</DialogTitle>
          <DialogDescription>
            Enter the amount you wish to withdraw from the drawer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleWithdraw} className="flex flex-col space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              autoFocus
              placeholder="0.00"
              className="text-right text-lg h-12 font-medium"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-md">{error}</p>}
          
          <div className="flex justify-end gap-3 pt-2 w-full">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="flex-1 h-12 text-lg bg-amber-600 hover:bg-amber-700" disabled={isLoading || amount <= 0}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Withdraw"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
