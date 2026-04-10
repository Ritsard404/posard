"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { openSessionAction } from "../_actions/session.action";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface OpenSessionModalProps {
  terminalId: string;
  terminalName: string;
  onSuccess: (sessionData: any) => void;
  onCancel: () => void;
}

export function OpenSessionModal({ terminalId, terminalName, onSuccess, onCancel }: OpenSessionModalProps) {
  const [pin, setPin] = useState("");
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hardcode an open state
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    
    if (openingCash < 0) {
      setError("Opening cash cannot be negative");
      return;
    }

    setIsLoading(true);
    const result = await openSessionAction(terminalId, pin, openingCash);
    setIsLoading(false);

    if (result.success && result.user) {
      onSuccess(result);
    } else {
      setError(result.error || "Failed to open session. Invalid PIN or terminal in use.");
      setPin("");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Open Session: {terminalName}</DialogTitle>
          <DialogDescription>
            Enter your PIN and the starting cash to unlock your terminal session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUnlock} className="flex flex-col space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Cashier / Manager PIN</Label>
            <Input
              id="pin"
              type="password"
              maxLength={6}
              autoFocus
              inputMode="numeric"
              placeholder="••••••"
              className="text-center text-xl tracking-widest h-12"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash">Opening Cash Amount</Label>
            <Input
              id="cash"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="text-right text-lg h-12 font-medium"
              value={openingCash || ""}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-md">{error}</p>}
          
          <div className="flex justify-end gap-3 pt-2 w-full">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || pin.length < 4} className="flex-1 h-12 text-lg">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Open Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
