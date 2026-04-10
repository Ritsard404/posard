"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authorizeManagerAction } from "../_actions/pos-auth.action";
import { Loader2 } from "lucide-react";

interface ManagerApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: string;
  referenceId: string;
  onSuccess: () => void;
}

export function ManagerApprovalModal({ open, onOpenChange, actionType, referenceId, onSuccess }: ManagerApprovalModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsLoading(true);
    const result = await authorizeManagerAction(pin, actionType, referenceId);
    setIsLoading(false);

    if (result.success) {
      setPin("");
      onSuccess();
      onOpenChange(false);
    } else {
      setError(result.error || "Invalid Manager PIN");
      setPin("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!val) {
            setPin("");
            setError(null);
        }
        onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Manager Approval Required</DialogTitle>
          <DialogDescription className="text-center">
            Enter Manager PIN to authorize this action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleApprove} className="flex flex-col space-y-4 py-4">
          <Input
            id="managerPin"
            type="password"
            maxLength={6}
            autoFocus
            inputMode="numeric"
            placeholder="••••••"
            className="text-center text-2xl tracking-widest h-14"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" disabled={isLoading || pin.length < 4} className="h-12 text-lg">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authorize"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
