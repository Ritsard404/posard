"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getSessionCashTrackAction,
  openSessionAction,
} from "../_actions/session.action";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cashTrackPrintService } from "../_services/cash-track-print.service";
import { printClientService } from "../_services/print-client.service";
import { toast } from "sonner";
import { usePOSStore } from "../_store/pos-store";

interface OpenSessionModalProps {
  terminalId: string;
  terminalName: string;
  onSuccess: (sessionData: {
    success: true;
    profileId: string;
    user: { name: string | null; role: string };
    sessionId: string;
    timestampId: string;
    terminal: {
      id: string;
      name: string;
      vat: number;
      discountMax: number;
      printerConfig: import("../_services/_dto/print.dto").PrinterConfigDto | null;
    };
  }) => void;
  onCancel: () => void;
}

export function OpenSessionModal({
  terminalId,
  terminalName,
  onSuccess,
  onCancel,
}: OpenSessionModalProps) {
  const activeDeviceId = usePOSStore((state) => state.activeDeviceId);
  const [managerPin, setManagerPin] = useState("");
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (openingCash < 0) {
      setError("Opening cash cannot be negative");
      return;
    }

    if (managerPin.length < 4) {
      setError("Manager PIN must be at least 4 digits.");
      return;
    }

    setIsLoading(true);
    const result = await openSessionAction(
      terminalId,
      managerPin,
      openingCash,
      activeDeviceId,
    );
    setIsLoading(false);

    if (result.success && result.user) {
      try {
        const reportResult = await getSessionCashTrackAction(result.timestampId);
        if (reportResult.success && reportResult.data) {
          const payload = cashTrackPrintService.buildPayload(
            reportResult.data,
            "cash-in",
          );

          const printResult = await printClientService.print(
            {
              title: payload.title,
              intent: "cash-in",
              previewContent: payload.previewContent,
              printerConfig: payload.printerConfig,
            },
            {
              fallbackToPreview: false,
            },
          );

          if (printResult.status === "printed") {
            toast.success("Cash-in slip sent to printer.", {
              description: printResult.message,
            });
          } else if (printResult.status !== "unsupported") {
            toast.error(printResult.message);
          }
        }
      } catch {
        // Keep session flow moving even if printing fails.
      }

      onSuccess({
        success: true,
        profileId: result.profileId,
        user: result.user,
        sessionId: result.sessionId,
        timestampId: result.timestampId,
        terminal: result.terminal,
      });
      return;
    }

    setError(
      "error" in result
        ? result.error || "Failed to open session. Terminal may be in use."
        : "Failed to open session. Terminal may be in use.",
    );
    setManagerPin("");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Open Session: {terminalName}
          </DialogTitle>
          <DialogDescription>
            Enter the starting cash and manager approval PIN to open this
            terminal for your logged-in account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleOpenSession} className="flex flex-col space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="cash">Opening Cash Amount</Label>
            <Input
              id="cash"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="h-12 text-right text-lg font-medium"
              value={openingCash || ""}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerPin">Approving Manager PIN</Label>
            <Input
              id="managerPin"
              type="password"
              maxLength={6}
              autoFocus
              inputMode="numeric"
              placeholder="••••••"
              className="h-12 text-center text-xl tracking-widest"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 p-2 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex w-full justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || openingCash < 0 || managerPin.length < 4}
              className="h-12 flex-1 text-lg"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                "Open Session"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
