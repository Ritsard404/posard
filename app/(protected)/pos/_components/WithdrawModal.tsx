"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getAvailableCashAction,
  getSessionCashTrackAction,
  withdrawCashAction,
} from "../_actions/session.action";
import { cashTrackPrintService } from "../_services/cash-track-print.service";
import { printClientService } from "../_services/print-client.service";
import { usePOSStore } from "../_store/pos-store";
import { verifyManagerPinOffline } from "../_services/offline-pin-verifier.client";
import {
  enqueueOfflineAction,
  getOfflineQueueSnapshot,
} from "../_services/offline-sync.client";

interface WithdrawModalProps {
  timestampId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WithdrawModal({
  timestampId,
  onSuccess,
  onCancel,
}: WithdrawModalProps) {
  const activeDeviceId = usePOSStore((state) => state.activeDeviceId);
  const activeCompanyId = usePOSStore((state) => state.activeCompanyId);
  const activeProfileId = usePOSStore((state) => state.activeProfileId);
  const activeTerminal = usePOSStore((state) => state.activeTerminal);
  const isOnline = usePOSStore((state) => state.isOnline);
  const managerVerifiers = usePOSStore((state) => state.managerVerifiers);
  const pinlessModeEnabled = activeTerminal?.pinlessModeEnabled === true;
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCash, setAvailableCash] = useState<number | null>(null);
  const withdrawalIdempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    async function fetchAvailable() {
      const res = await getAvailableCashAction(timestampId);
      if (res.success) {
        setAvailableCash(res.availableCash ?? null);
      }
    }

    void fetchAvailable();
  }, [isOnline, timestampId]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Withdrawal amount must be greater than 0");
      return;
    }

    const normalizedReason = reason.trim();
    if (!normalizedReason || normalizedReason.length > 200) {
      setError("Withdrawal reason is required and must be 200 characters or fewer.");
      return;
    }

    if (!isOnline) {
      setError("Cash withdrawal requires an online manager approval.");
      return;
    }

    if (!pinlessModeEnabled && pin.length < 4) {
      setError("Manager PIN is required (min 4 digits)");
      return;
    }

    setIsLoading(true);

    try {
      if (!isOnline) {
        if (!activeDeviceId || !activeCompanyId || !activeProfileId || !activeTerminal) {
          throw new Error("Offline withdrawal needs an active synced session.");
        }

        const manager = pinlessModeEnabled
          ? null
          : await verifyManagerPinOffline({
              companyId: activeCompanyId,
              deviceId: activeDeviceId,
              pin,
              verifiers: managerVerifiers,
            });

        if (!pinlessModeEnabled && !manager) {
          throw new Error("Invalid Manager PIN");
        }

        const queue = await getOfflineQueueSnapshot();
        await enqueueOfflineAction({
          localId: crypto.randomUUID(),
          type: "WITHDRAW_CASH",
          idempotencyKey: `${activeTerminal.id}-${activeDeviceId}-${crypto.randomUUID()}`,
          timestampId,
          terminalId: activeTerminal.id,
          deviceId: activeDeviceId,
          cashierId: activeProfileId,
          companyId: activeCompanyId,
          createdAtLocal: new Date().toISOString(),
          syncStatus: "pending",
          lastError: null,
          syncedAt: null,
          payload: {
            amount,
            reason: normalizedReason,
            ...(manager
              ? {
                  managerProfileId: manager.id,
                  managerEmail: manager.email,
                  managerName: manager.name,
                }
              : {}),
          },
        });

        usePOSStore.getState().setSyncCounts({
          pendingSyncCount: queue.pendingCount + 1,
          syncingCount: queue.syncingCount,
          needsReviewCount: queue.needsReviewCount,
          lastSyncMessage: "Withdrawal queued for sync.",
        });
        toast.success("Cash withdrawal queued offline.");
        onSuccess();
        return;
      }

      const result = await withdrawCashAction(
        timestampId,
        amount,
        pin,
        normalizedReason,
        withdrawalIdempotencyKeyRef.current ??
          (withdrawalIdempotencyKeyRef.current = crypto.randomUUID()),
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to withdraw cash.");
      }

      toast.success("Cash withdrawn successfully");
      withdrawalIdempotencyKeyRef.current = null;
      try {
        const reportResult = await getSessionCashTrackAction(timestampId);
        if (reportResult.success && reportResult.data) {
          const payload = cashTrackPrintService.buildPayload(
            reportResult.data,
            "cash-out",
          );

          const printResult = await printClientService.print(
            {
              title: payload.title,
              intent: "cash-out",
              previewContent: payload.previewContent,
              printerConfig: payload.printerConfig,
            },
            {
              fallbackToPreview: false,
            },
          );

          if (printResult.status === "printed") {
            toast.success("Cash withdrawal slip sent to printer.", {
              description: printResult.message,
            });
          } else {
            toast.error(printResult.message);
          }
        }
      } catch {
        // Keep cashier flow moving even if printer access fails.
      }
      onSuccess();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to withdraw cash.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="overflow-hidden border-white/5 p-0 shadow-2xl shadow-amber-900/10 backdrop-blur-3xl sm:max-w-md">
        <div className="relative flex flex-col items-center border-b border-white/5 bg-amber-500/10 p-8 text-center">
          <div className="pointer-events-none absolute -left-10 top-0 size-32 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20">
            <Wallet className="h-8 w-8 text-amber-500" />
          </div>
          <DialogHeader className="p-0">
            <DialogTitle className="font-heading text-3xl font-black tracking-tight text-amber-500">
              Withdraw Cash
            </DialogTitle>
            <DialogDescription className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
              Adjusting physical register balances
              {availableCash !== null ? (
                <span className="mt-1 block text-amber-500/80">
                  Available: PHP{" "}
                  {availableCash.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleWithdraw} className="relative flex flex-col space-y-8 p-8">
          <div className="space-y-4">
            <Label
              htmlFor="amount"
              className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40"
            >
              Withdrawal Amount
            </Label>
            <div className="group relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-heading text-xl font-black text-amber-500/50 transition-colors group-focus-within:text-amber-500">
                PHP
              </span>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                placeholder="0.00"
                className="h-20 rounded-2xl bg-white/5 pl-16 pr-6 font-heading text-4xl font-black tracking-tighter transition-all focus:bg-white/10"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="withdrawal-reason"
              className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40"
            >
              Withdrawal Reason
            </Label>
            <Input
              id="withdrawal-reason"
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Petty cash, bank deposit, supplier payment..."
              className="h-12 rounded-2xl bg-white/5"
            />
          </div>

          {!pinlessModeEnabled ? (
          <div className="space-y-4">
            <Label
              htmlFor="pin"
              className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40"
            >
              Manager Signature (PIN)
            </Label>
            <div className="group relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500/50 transition-colors group-focus-within:text-amber-500">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <Input
                id="pin"
                type="password"
                maxLength={6}
                inputMode="numeric"
                placeholder="••••••"
                className="h-16 rounded-2xl bg-white/5 pl-12 pr-6 text-center font-heading text-2xl font-black tracking-widest transition-all focus:bg-white/10"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold uppercase tracking-widest text-red-500">
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="h-14 flex-1 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 transition-all hover:bg-white/5 hover:text-muted-foreground"
              onClick={onCancel}
              disabled={isLoading}
            >
              Close Window
            </Button>
            <Button
              type="submit"
              className="flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-amber-600 font-heading text-lg font-black uppercase tracking-widest text-white shadow-2xl shadow-amber-600/20 transition-all hover:bg-amber-500 active:scale-95 disabled:opacity-20"
              disabled={
                isLoading ||
                amount <= 0 ||
                !reason.trim() ||
                (!pinlessModeEnabled && pin.length < 4)
              }
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
