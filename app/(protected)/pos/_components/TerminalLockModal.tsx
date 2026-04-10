"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { unlockTerminalAction } from "../_actions/pos-auth.action";
import { Loader2 } from "lucide-react";

interface TerminalLockModalProps {
  onUnlocked: (user: { name: string | null; role: string }) => void;
}

export function TerminalLockModal({ onUnlocked }: TerminalLockModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hardcode an open state so it can't be closed by clicking outside
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsLoading(true);
    const result = await unlockTerminalAction(pin);
    setIsLoading(false);

    if (result.success && result.user) {
      onUnlocked(result.user);
    } else {
      setError(result.error || "Invalid PIN");
      setPin("");
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Terminal Locked</DialogTitle>
          <DialogDescription className="text-center">
            Enter your PIN to unlock the Point of Sale terminal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUnlock} className="flex flex-col space-y-4 py-4">
          <Input
            id="pin"
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
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Unlock"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
