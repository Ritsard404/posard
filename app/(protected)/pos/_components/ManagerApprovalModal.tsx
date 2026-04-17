"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authorizeManagerAction } from "../_actions/pos-auth.action";
import { Loader2 } from "lucide-react";

interface ManagerApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: string;
  referenceId: string;
  onSuccess: (manager: { email: string; name: string }) => void;
}

export function ManagerApprovalModal({
  open,
  onOpenChange,
  actionType,
  referenceId,
  onSuccess,
}: ManagerApprovalModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }

    try {
      setIsLoading(true);

      const result = await authorizeManagerAction(pin, actionType, referenceId);

      if (result.success) {
        setPin("");
        setError(null);
        onSuccess(result.manager);
        onOpenChange(false);
        return;
      }

      setError(result.error || "Invalid manager PIN.");
      setPin("");
    } catch {
      setError("Unable to authorize manager action.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Manager Approval Required
          </DialogTitle>
          <DialogDescription className="text-center">
            Enter manager PIN to authorize this action.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleApprove}
          autoComplete="off"
          className="flex flex-col space-y-4 py-4"
        >
          {/* Decoy fields to reduce Chrome password manager suggestions */}
          <input
            type="text"
            name="fake-username"
            autoComplete="username"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            type="password"
            name="fake-password"
            autoComplete="current-password"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />

          <Input
            id="managerPin"
            name="mgr-auth-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            autoComplete="off"
            placeholder="••••••"
            className="h-14 text-center text-2xl tracking-widest"
            value={"•".repeat(pin.length)}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length > pin.length) {
                // A character was added — grab the last character typed
                const addedChar = newValue[newValue.length - 1];
                if (/\d/.test(addedChar)) {
                  setPin((prev) => (prev + addedChar).slice(0, 6));
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                setPin((prev) => prev.slice(0, -1));
                e.preventDefault();
              }
            }}
          />

          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={isLoading || pin.length < 4}
            className="h-12 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Authorizing...
              </>
            ) : (
              "Authorize"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
