"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { closeSessionAction } from "../_actions/session.action";

interface CloseSessionModalProps {
  sessionId: string;
  timestampId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CloseSessionModal({ sessionId, timestampId, onSuccess, onCancel }: CloseSessionModalProps) {
  const [countedCash, setCountedCash] = useState<number>(0);
  const [managerPin, setManagerPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (countedCash < 0) {
      setError("Counted cash cannot be negative");
      return;
    }

    if (managerPin.length < 4) {
      setError("Manager PIN must be at least 4 digits");
      return;
    }

    setIsLoading(true);
    const result = await closeSessionAction(sessionId, timestampId, countedCash, managerPin);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to close session. Invalid Manager PIN.");
      setManagerPin("");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-destructive">Close Session (Cash Out)</DialogTitle>
          <DialogDescription>
            Enter the final counted cash in drawer and the Manager PIN to securely close this session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleClose} className="flex flex-col space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="countedCash">Counted Cash Amount</Label>
              <Input
                id="countedCash"
                type="number"
                min="0"
                step="0.01"
                autoFocus
                placeholder="0.00"
                className="text-right text-lg h-12 font-medium"
                value={countedCash || ""}
                onChange={(e) => setCountedCash(Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="managerPin">Approving Manager PIN</Label>
              <Input
                id="managerPin"
                type="password"
                maxLength={6}
                inputMode="numeric"
                placeholder="••••••"
                className="text-center text-xl tracking-widest h-12"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-md">{error}</p>}
          
          <div className="flex justify-end gap-3 pt-2 w-full">
            <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" className="flex-1 h-12 text-lg" disabled={isLoading || managerPin.length < 4 || countedCash < 0}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Close Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
