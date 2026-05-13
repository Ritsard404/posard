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
import { Loader2, ScanLine, ShieldCheck, SmartphoneNfc } from "lucide-react";
import { usePOSStore } from "../_store/pos-store";
import { verifyManagerPinOffline } from "../_services/offline-pin-verifier.client";
import { deviceCapabilityService } from "@/lib/scanning/device-capability.service";
import type { DeviceCapabilityDto } from "@/lib/scanning/scan.dto";
import { getApprovalInputStrategies } from "../_services/approval-input.service";

interface ManagerApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: string;
  referenceId: string;
  onSuccess: (
    manager: { id: string; email: string; name: string; role?: string },
    pin: string,
  ) => void | Promise<void>;
}

export function ManagerApprovalModal({
  open,
  onOpenChange,
  actionType,
  referenceId,
  onSuccess,
}: ManagerApprovalModalProps) {
  const isOnline = usePOSStore((state) => state.isOnline);
  const activeDeviceId = usePOSStore((state) => state.activeDeviceId);
  const activeCompanyId = usePOSStore((state) => state.activeCompanyId);
  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);
  const managerVerifiers = usePOSStore((state) => state.managerVerifiers);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<DeviceCapabilityDto | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(null);
      setIsLoading(false);
      return;
    }

    void deviceCapabilityService.getCapabilities().then(setCapabilities);
  }, [open]);

  const approvalStrategies = getApprovalInputStrategies({
    nfcSupported: capabilities?.nfc.supported,
  });

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }

    try {
      setIsLoading(true);

      if (!isOnline) {
        if (!activeDeviceId || !activeCompanyId || !activeTimestampId) {
          setError("Offline approval requires an active device session.");
          setPin("");
          return;
        }

        const match = await verifyManagerPinOffline({
          companyId: activeCompanyId,
          deviceId: activeDeviceId,
          pin,
          verifiers: managerVerifiers,
        });

        if (!match) {
          setError("Invalid manager PIN.");
          setPin("");
          return;
        }

        const approvedPin = pin;
        setPin("");
        setError(null);
        await onSuccess(match, approvedPin);
        onOpenChange(false);
        return;
      }

      const result = await authorizeManagerAction(pin, actionType, referenceId);

      if (result.success) {
        const approvedPin = pin;
        setPin("");
        setError(null);
        await onSuccess(result.manager, approvedPin);
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

        <div className="grid grid-cols-3 gap-2">
          {approvalStrategies.map((strategy) => {
            const Icon =
              strategy.method === "pin"
                ? ShieldCheck
                : strategy.method === "barcode_badge"
                  ? ScanLine
                  : SmartphoneNfc;

            return (
              <button
                key={strategy.method}
                type="button"
                disabled={!strategy.enabled}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center text-xs font-semibold ${
                  strategy.enabled
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
                title={strategy.description}
              >
                <Icon className="size-4" />
                <span>{strategy.label}</span>
                {!strategy.enabled ? (
                  <span className="text-[9px] uppercase tracking-wide">
                    {strategy.status === "unsupported" ? "Later" : "Prepared"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

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
