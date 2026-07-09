"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeSessionAction } from "../_actions/session.action";
import { ReportPrintControls } from "@/app/(protected)/report/_components/ReportPrintControls";
import type { ReportPrintPayloadDto } from "@/app/(protected)/report/_services/_dto/report.dto";
import { toast } from "sonner";
import { usePOSStore } from "../_store/pos-store";
import { verifyManagerPinOffline } from "../_services/offline-pin-verifier.client";
import {
  enqueueOfflineAction,
  getOfflineQueueSnapshot,
} from "../_services/offline-sync.client";

interface CloseSessionModalProps {
  sessionId: string;
  timestampId: string;
  terminalId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CloseSessionModal({
  sessionId,
  timestampId,
  terminalId,
  onSuccess,
  onCancel,
}: CloseSessionModalProps) {
  const activeDeviceId = usePOSStore((state) => state.activeDeviceId);
  const activeCompanyId = usePOSStore((state) => state.activeCompanyId);
  const activeProfileId = usePOSStore((state) => state.activeProfileId);
  const activeTerminal = usePOSStore((state) => state.activeTerminal);
  const managerVerifiers = usePOSStore((state) => state.managerVerifiers);
  const isOnline = usePOSStore((state) => state.isOnline);
  const pinlessModeEnabled = activeTerminal?.pinlessModeEnabled === true;
  const [countedCash, setCountedCash] = useState<number>(0);
  const [managerPin, setManagerPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [xReadingPayload, setXReadingPayload] =
    useState<ReportPrintPayloadDto | null>(null);
  const [didCloseSession, setDidCloseSession] = useState(false);

  const handleDialogChange = (open: boolean) => {
    if (open) {
      return;
    }

    if (didCloseSession) {
      onSuccess();
      return;
    }

    onCancel();
  };

  const handleClose = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (countedCash < 0) {
      setError("Counted cash cannot be negative.");
      return;
    }

    if (!pinlessModeEnabled && managerPin.length < 4) {
      setError("Manager PIN must be at least 4 digits.");
      return;
    }

    setIsLoading(true);

    if (!isOnline) {
      try {
        if (!activeDeviceId || !activeCompanyId || !activeProfileId || !terminalId) {
          throw new Error("Offline close needs an active synced session.");
        }

        const manager = pinlessModeEnabled
          ? null
          : await verifyManagerPinOffline({
              companyId: activeCompanyId,
              deviceId: activeDeviceId,
              pin: managerPin,
              verifiers: managerVerifiers,
            });

        if (!pinlessModeEnabled && !manager) {
          throw new Error("Invalid Manager PIN");
        }

        const queue = await getOfflineQueueSnapshot();
        await enqueueOfflineAction({
          localId: crypto.randomUUID(),
          type: "CLOSE_SESSION",
          idempotencyKey: `${terminalId}-${activeDeviceId}-${crypto.randomUUID()}`,
          timestampId,
          terminalId,
          deviceId: activeDeviceId,
          cashierId: activeProfileId,
          companyId: activeCompanyId,
          createdAtLocal: new Date().toISOString(),
          syncStatus: "pending",
          lastError: null,
          syncedAt: null,
          payload: {
            sessionId,
            countedCash,
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
          lastSyncMessage: "Close session queued for sync.",
        });
        setDidCloseSession(true);
        setXReadingPayload(null);
        setManagerPin("");
        toast.success("Session close queued offline.");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to queue session close.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const result = await closeSessionAction(
      sessionId,
      timestampId,
      countedCash,
      managerPin,
    );

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to close session.");
      setManagerPin("");
      return;
    }

    setDidCloseSession(true);
    setXReadingPayload(result.data?.xReadingPayload ?? null);
    setManagerPin("");
  };

  return (
    <Dialog open onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl">
        {!didCloseSession ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-destructive">
                Close Session
              </DialogTitle>
              <DialogDescription>
                {pinlessModeEnabled
                  ? "Enter the final counted cash in drawer to close the register."
                  : "Enter the final counted cash in drawer and manager PIN to close the register."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleClose} className="flex flex-col gap-6 py-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="countedCash">Counted Cash Amount</Label>
                  <Input
                    id="countedCash"
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    placeholder="0.00"
                    className="h-12 text-right text-lg font-medium"
                    value={countedCash || ""}
                    onChange={(event) =>
                      setCountedCash(Number(event.target.value))
                    }
                  />
                </div>

                {!pinlessModeEnabled ? (
                <div className="grid gap-2">
                  <Label htmlFor="managerPin">Approving Manager PIN</Label>
                  <Input
                    id="managerPin"
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="••••••"
                    className="h-12 text-center text-xl tracking-widest"
                    value={managerPin}
                    onChange={(event) =>
                      setManagerPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                  />
                </div>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              <DialogFooter className="gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="h-12"
                  disabled={
                    isLoading ||
                    (!pinlessModeEnabled && managerPin.length < 4) ||
                    countedCash < 0
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Closing
                    </>
                  ) : (
                    "Close Session"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Session Closed
              </DialogTitle>
              <DialogDescription>
                The session is closed. Print the X-reading now or use the
                preview below.
              </DialogDescription>
            </DialogHeader>

            {xReadingPayload ? (
              <div className="grid gap-4 py-4">
                <ReportPrintControls
                  payload={xReadingPayload}
                  terminalId={terminalId}
                />
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <pre className="max-h-[48vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
                    {xReadingPayload.previewContent}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                X-reading could not be generated for this close action. The
                session was still closed successfully.
              </div>
            )}

            <DialogFooter>
              <Button type="button" className="h-12" onClick={onSuccess}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
