"use client";

import React, { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Cable,
  CloudOff,
  LayoutGrid,
  LogOut,
  Maximize2,
  MoreHorizontal,
  MonitorUp,
  Minimize2,
  RefreshCw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { CashTrackTrigger } from "@/components/layout/CashTrackTrigger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePOSStore } from "../_store/pos-store";
import { cn } from "@/lib/utils";
import { WithdrawModal } from "./WithdrawModal";
import { CloseSessionModal } from "./CloseSessionModal";
import { SessionPrinterConfigDialog } from "./SessionPrinterConfigDialog";
import { formatCurrency, usePOSPaymentSummary } from "./checkout-shared";
import { getOfflineQueueSnapshot, syncOfflineActions } from "../_services/offline-sync.client";
import { CustomerDisplayPublisher } from "./CustomerDisplayPublisher";
import { publishCustomerDisplayAction } from "../_actions/customer-display.action";

interface POSLayoutProps {
  children: React.ReactNode;
  cart: React.ReactNode;
  tender: React.ReactNode;
}

export function POSLayout({ children, cart, tender }: POSLayoutProps) {
  const isMobile = useIsMobile();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);
  const activeSessionId = usePOSStore((state) => state.activeSessionId);
  const activeTerminal = usePOSStore((state) => state.activeTerminal);
  const activeTerminalId = usePOSStore((state) => state.activeTerminal?.id ?? null);
  const customerDisplayEnabled = usePOSStore(
    (state) => state.customerDisplayEnabled,
  );
  const setCustomerDisplayEnabled = usePOSStore(
    (state) => state.setCustomerDisplayEnabled,
  );
  const setSession = usePOSStore((state) => state.setSession);
  const isOnline = usePOSStore((state) => state.isOnline);
  const pendingSyncCount = usePOSStore((state) => state.pendingSyncCount);
  const syncingCount = usePOSStore((state) => state.syncingCount);
  const needsReviewCount = usePOSStore((state) => state.needsReviewCount);
  const lastSyncMessage = usePOSStore((state) => state.lastSyncMessage);
  const setSyncCounts = usePOSStore((state) => state.setSyncCounts);
  const activeMobileTab = usePOSStore((state) => state.activeMobileTab);
  const setActiveMobileTab = usePOSStore((state) => state.setActiveMobileTab);
  const { activeItemCount, total } = usePOSPaymentSummary();

  const mobileTabs: Array<{
    id: "menu" | "cart" | "tender";
    label: string;
    icon: typeof LayoutGrid;
  }> = [
    { id: "menu", label: "Menu", icon: LayoutGrid },
    { id: "cart", label: "Cart", icon: ShoppingCart },
    { id: "tender", label: "Tender", icon: Wallet },
  ];

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  async function handleToggleFullscreen() {
    if (!document.fullscreenEnabled) {
      toast.error("Fullscreen is not available in this browser.");
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error("Unable to change fullscreen mode.");
    }
  }

  async function handleOpenCustomerDisplay() {
    if (!activeTerminalId) {
      toast.error("Open a terminal session first.");
      return;
    }

    if (!customerDisplayEnabled) {
      setCustomerDisplayEnabled(true);
    }

    const url = `${window.location.origin}/pos/customer-display/${activeTerminalId}`;
    window.open(url, "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard?.writeText(url);
      toast.success("Customer display link copied.");
    } catch {
      toast.success("Customer display opened.");
    }
  }

  async function handleDisableCustomerDisplay() {
    if (activeTerminalId) {
      await publishCustomerDisplayAction({
        terminalId: activeTerminalId,
        status: "idle",
        items: [],
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        totalDue: 0,
        paymentMethod: null,
        cashReceived: null,
        change: null,
        message: "Ready for next customer",
        updatedAt: new Date().toISOString(),
      });
    }

    setCustomerDisplayEnabled(false);
    toast.success("Customer display is off.", {
      description: "No second-screen updates will be published from this device.",
    });
  }

  async function handleManualSync() {
    if (!isOnline) {
      toast.error("Reconnect this device before retrying sync.");
      return;
    }

    try {
      const result = await syncOfflineActions();
      for (const item of result.results) {
        usePOSStore
          .getState()
          .offlineReceipts.filter((receipt) => receipt.localId === item.localId)
          .forEach((receipt) => {
            usePOSStore
              .getState()
              .updateOfflineReceiptStatus(receipt.receiptId, item.syncStatus);
          });
      }
      const queue = await getOfflineQueueSnapshot();
      const syncedCount = result.results.filter(
        (item) => item.syncStatus === "synced",
      ).length;

      setSyncCounts({
        pendingSyncCount: queue.pendingCount,
        syncingCount: queue.syncingCount,
        needsReviewCount: queue.needsReviewCount,
        lastSyncMessage:
          syncedCount > 0 ? `Synced ${syncedCount} queued action(s).` : "Queue is up to date.",
      });

      toast.success(
        syncedCount > 0 ? "Offline queue synced." : "No queued actions to sync.",
      );
    } catch (error) {
      const queue = await getOfflineQueueSnapshot();
      setSyncCounts({
        pendingSyncCount: queue.pendingCount,
        syncingCount: queue.syncingCount,
        needsReviewCount: queue.needsReviewCount,
        lastSyncMessage:
          error instanceof Error ? error.message : "Unable to sync offline queue.",
      });
      toast.error(
        error instanceof Error ? error.message : "Unable to sync offline queue.",
      );
    }
  }

  return (
    <div data-testid="pos-shell" className="flex h-full max-h-full w-full max-w-full flex-col overflow-hidden bg-background">
      <CustomerDisplayPublisher />
      <HeaderActions>
        <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden">
          <Badge
            variant={isOnline ? "secondary" : "destructive"}
            className="hidden rounded-full px-3 py-1 sm:inline-flex"
          >
            {isOnline ? "Online" : "Offline Mode"}
          </Badge>
          <Badge
            variant="outline"
            className="hidden rounded-full px-3 py-1 sm:inline-flex"
          >
            Pending Sync {pendingSyncCount}
          </Badge>
          {needsReviewCount > 0 ? (
            <Badge
              variant="outline"
              className="hidden rounded-full border-amber-500/30 px-3 py-1 text-amber-600 sm:inline-flex"
            >
              Needs Review {needsReviewCount}
            </Badge>
          ) : null}
          {isMobile ? (
            <>
              <CashTrackTrigger />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 rounded-lg px-2.5">
                    <MoreHorizontal className="size-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                  <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => void handleManualSync()}>
                    {syncingCount > 0 ? (
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CloudOff className="mr-2 size-4" />
                    )}
                    {syncingCount > 0 ? "Syncing queue" : "Retry sync"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!activeTerminalId}
                    onClick={() =>
                      customerDisplayEnabled
                        ? void handleDisableCustomerDisplay()
                        : void handleOpenCustomerDisplay()
                    }
                  >
                    <MonitorUp className="mr-2 size-4" />
                    {customerDisplayEnabled ? "Turn display off" : "Turn display on"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleToggleFullscreen()}>
                    {isFullscreen ? (
                      <Minimize2 className="mr-2 size-4" />
                    ) : (
                      <Maximize2 className="mr-2 size-4" />
                    )}
                    {isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPrinterConfig(true)}>
                    <Cable className="mr-2 size-4" />
                    Printer setup
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowWithdraw(true)}>
                    <Wallet className="mr-2 size-4" />
                    Withdraw cash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowCloseSession(true)}
                  >
                    <LogOut className="mr-2 size-4" />
                    Close session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleManualSync()}
                className="h-9 shrink-0 rounded-lg px-2.5"
              >
                {syncingCount > 0 ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <CloudOff className="size-4" />
                )}
                <span className="hidden lg:inline">
                  {syncingCount > 0 ? "Syncing" : "Retry Sync"}
                </span>
                <span className="lg:hidden">Sync</span>
              </Button>
              <CashTrackTrigger />
              {customerDisplayEnabled ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleDisableCustomerDisplay()}
                  className="h-9 shrink-0 rounded-lg px-2.5"
                >
                  <MonitorUp className="size-4" />
                  <span className="hidden xl:inline">Display On</span>
                  <span className="xl:hidden">On</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleOpenCustomerDisplay()}
                  className="h-9 shrink-0 rounded-lg px-2.5"
                  disabled={!activeTerminalId}
                >
                  <MonitorUp className="size-4" />
                  <span className="hidden xl:inline">Display Off</span>
                  <span className="xl:hidden">Off</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFullscreen}
                className="h-9 shrink-0 rounded-lg px-2.5"
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
                <span className="hidden lg:inline">
                  {isFullscreen ? "Exit" : "Fullscreen"}
                </span>
                <span className="lg:hidden">{isFullscreen ? "Exit" : "Full"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrinterConfig(true)}
                className="hidden h-9 shrink-0 rounded-lg px-2.5 sm:flex"
              >
                <Cable className="mr-1.5 size-4" />
                Printer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWithdraw(true)}
                className="hidden h-9 shrink-0 rounded-lg px-2.5 sm:flex"
              >
                <Wallet className="mr-1.5 size-4" />
                Withdraw
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCloseSession(true)}
                className="hidden h-9 shrink-0 rounded-lg px-2.5 sm:flex"
              >
                <LogOut className="mr-1.5 size-4" />
                Close
              </Button>
            </>
          )}
        </div>
      </HeaderActions>

      <div className="flex items-center justify-between gap-2 border-b bg-muted/10 px-3 py-2 text-xs sm:hidden">
        <Badge variant={isOnline ? "secondary" : "destructive"} className="rounded-full px-2.5 py-0.5">
          {isOnline ? "Online" : "Offline Mode"}
        </Badge>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
            Pending {pendingSyncCount}
          </Badge>
          {needsReviewCount > 0 ? (
            <Badge variant="outline" className="rounded-full border-amber-500/30 px-2.5 py-0.5 text-amber-600">
              Review {needsReviewCount}
            </Badge>
          ) : null}
        </div>
      </div>

      {activeTerminal?.billingLocked ? (
        <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950">
          {activeTerminal.billingMessage ??
            "Transactions are disabled because this terminal subscription is not active. Cash tracking and session controls remain available."}
        </div>
      ) : null}

      <div data-testid="pos-workspace" className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {isMobile ? (
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              {activeMobileTab === "menu" ? children : null}
              {activeMobileTab === "cart" ? cart : null}
              {activeMobileTab === "tender" ? tender : null}
            </div>

            <button
              type="button"
              onClick={() => setActiveMobileTab("cart")}
              className="flex shrink-0 items-center justify-between border-t bg-card px-4 py-3 text-left"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Active Order
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {activeItemCount} {activeItemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Running Total
                </p>
                <p className="mt-1 font-heading text-2xl font-black tracking-tight text-foreground">
                  ₱ {formatCurrency(total)}
                </p>
              </div>
            </button>

            <div className="grid h-16 shrink-0 grid-cols-3 border-t bg-background">
              {mobileTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMobileTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMobileTab(tab.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div data-testid="pos-product-column" className="h-full min-w-0 flex-1 overflow-hidden">{children}</div>
            <div data-testid="pos-cart-column" className="h-full w-[288px] shrink-0 border-l bg-card lg:w-[304px] xl:w-[340px]">
              {cart}
            </div>
          </>
        )}
      </div>

      {lastSyncMessage ? (
        <div className="border-t bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
          {lastSyncMessage}
        </div>
      ) : null}

      {showWithdraw && activeTimestampId && (
        <WithdrawModal
          timestampId={activeTimestampId}
          onSuccess={() => setShowWithdraw(false)}
          onCancel={() => setShowWithdraw(false)}
        />
      )}

      <SessionPrinterConfigDialog
        open={showPrinterConfig}
        onOpenChange={setShowPrinterConfig}
      />

      {showCloseSession && activeSessionId && activeTimestampId && (
        <CloseSessionModal
          sessionId={activeSessionId}
          timestampId={activeTimestampId}
          terminalId={activeTerminalId}
          onSuccess={() => {
            setShowCloseSession(false);
            setSession({ sessionId: null, timestampId: null, terminal: null, user: null });
          }}
          onCancel={() => setShowCloseSession(false)}
        />
      )}
    </div>
  );
}
