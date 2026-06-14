"use client";

import React, { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Cable,
  LayoutGrid,
  LogOut,
  Maximize2,
  MoreHorizontal,
  MonitorUp,
  Minimize2,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CustomerDisplayPublisher } from "./CustomerDisplayPublisher";
import { publishCustomerDisplayAction } from "../_actions/customer-display.action";
import { printClientService } from "../_services/print-client.service";
import { NetworkSyncStatusIndicator } from "./NetworkSyncStatusIndicator";

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
  const lastReconnectKeyRef = useRef<string | null>(null);

  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);
  const activeSessionId = usePOSStore((state) => state.activeSessionId);
  const activeTerminal = usePOSStore((state) => state.activeTerminal);
  const fulfillment = usePOSStore((state) => state.fulfillment);
  const setFulfillment = usePOSStore((state) => state.setFulfillment);
  const printerConnectionStatus = usePOSStore(
    (state) => state.printerConnectionStatus,
  );
  const setPrinterConnectionStatus = usePOSStore(
    (state) => state.setPrinterConnectionStatus,
  );
  const activeTerminalId = usePOSStore(
    (state) => state.activeTerminal?.id ?? null,
  );
  const customerDisplayEnabled = usePOSStore(
    (state) => state.customerDisplayEnabled,
  );
  const setCustomerDisplayEnabled = usePOSStore(
    (state) => state.setCustomerDisplayEnabled,
  );
  const setSession = usePOSStore((state) => state.setSession);
  const isOnline = usePOSStore((state) => state.isOnline);
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

  useEffect(() => {
    return printClientService.subscribeToBluetoothStatus(
      setPrinterConnectionStatus,
    );
  }, [setPrinterConnectionStatus]);

  useEffect(() => {
    const printerConfig = activeTerminal?.printerConfig;

    if (printerConfig?.driver !== "webbluetooth") {
      lastReconnectKeyRef.current = null;
      return;
    }

    const reconnectKey = [
      activeTerminal?.id,
      printerConfig.deviceId,
      printerConfig.serviceUuid,
      printerConfig.characteristicUuid,
    ].join(":");

    if (lastReconnectKeyRef.current === reconnectKey) {
      return;
    }

    lastReconnectKeyRef.current = reconnectKey;
    void printClientService.reconnectKnownPrinter(printerConfig);
  }, [activeTerminal?.id, activeTerminal?.printerConfig]);

  const printerLabel =
    activeTerminal?.printerConfig?.driver === "webbluetooth"
      ? printerConnectionStatus.state === "connected"
        ? "Connected"
        : printerConnectionStatus.state === "reconnecting"
          ? "Reconnecting"
          : printerConnectionStatus.state === "connecting"
            ? "Connecting"
            : "Disconnected"
      : activeTerminal?.printerConfig?.mode
        ? "Configured"
        : "No Printer";
  const printerBadgeVariant =
    printerConnectionStatus.state === "connected" ||
    (activeTerminal?.printerConfig?.mode &&
      activeTerminal.printerConfig.driver !== "webbluetooth")
      ? "secondary"
      : "outline";

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
      description:
        "No second-screen updates will be published from this device.",
    });
  }

  return (
    <div
      data-testid="pos-shell"
      className="flex h-full max-h-full w-full max-w-full flex-col overflow-hidden bg-background"
    >
      <CustomerDisplayPublisher />
      <HeaderActions>
        <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden">
          <Badge
            variant={isOnline ? "secondary" : "destructive"}
            className="hidden rounded-full px-3 py-1 sm:inline-flex"
          >
            {isOnline ? "Online" : "Offline Mode"}
          </Badge>
          {isMobile ? (
            <>
              <CashTrackTrigger />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg px-2.5"
                  >
                    <MoreHorizontal className="size-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                  <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={!activeTerminalId}
                    onClick={() =>
                      customerDisplayEnabled
                        ? void handleDisableCustomerDisplay()
                        : void handleOpenCustomerDisplay()
                    }
                  >
                    <MonitorUp className="mr-2 size-4" />
                    {customerDisplayEnabled
                      ? "Turn display off"
                      : "Turn display on"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void handleToggleFullscreen()}
                  >
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
                <span className="lg:hidden">
                  {isFullscreen ? "Exit" : "Full"}
                </span>
              </Button>
              <Button
                variant={printerBadgeVariant}
                size="sm"
                onClick={() => setShowPrinterConfig(true)}
                className="hidden h-9 shrink-0 rounded-lg px-2.5 sm:flex"
              >
                <Cable className="mr-1.5 size-4" />
                <span>Printer: {printerLabel}</span>
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

      <div className="border-b bg-background px-3 py-2">
        <NetworkSyncStatusIndicator />
      </div>

      {activeTerminal?.billingLocked ? (
        <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950">
          {activeTerminal.billingMessage ??
            "Transactions are disabled because this terminal subscription is not active. Cash tracking and session controls remain available."}
        </div>
      ) : null}

      {activeTerminal?.enableFulfillmentTypes ? (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b bg-card px-3 py-2">
          {(["WALK_IN", "DINE_IN", "TAKE_OUT", "DELIVERY", "PICKUP"] as const)
            .filter((type) => {
              if (type === "DINE_IN") return activeTerminal.enableTableService;
              if (type === "DELIVERY")
                return activeTerminal.enableDeliveryDetails;
              return true;
            })
            .map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={fulfillment.type === type ? "default" : "outline"}
                className="h-8 shrink-0 rounded-full px-3 text-[10px] font-bold uppercase"
                onClick={() => setFulfillment({ type })}
              >
                {type.replace(/_/g, " ")}
              </Button>
            ))}
          {fulfillment.type === "DINE_IN" &&
          activeTerminal.enableTableService ? (
            <Input
              value={fulfillment.tableNumber ?? ""}
              onChange={(event) =>
                setFulfillment({ tableNumber: event.target.value })
              }
              placeholder="Table"
              className="h-8 w-24 shrink-0 text-xs"
            />
          ) : null}
          {fulfillment.type === "DELIVERY" &&
          activeTerminal.enableDeliveryDetails ? (
            <Input
              value={fulfillment.deliveryReference ?? ""}
              onChange={(event) =>
                setFulfillment({ deliveryReference: event.target.value })
              }
              placeholder="Delivery ref"
              className="h-8 w-32 shrink-0 text-xs"
            />
          ) : null}
        </div>
      ) : null}

      <div
        data-testid="pos-workspace"
        className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
      >
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
              className="flex shrink-0 items-center justify-between border-t bg-card px-3 py-2 text-left"
            >
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Active Order
                </p>
                <p className="text-[13px] font-semibold text-foreground">
                  {activeItemCount} {activeItemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Running Total
                </p>
                <p className="font-heading text-xl font-black tracking-tight text-foreground">
                  ₱ {formatCurrency(total)}
                </p>
              </div>
            </button>

            <div className="grid h-14 shrink-0 grid-cols-3 border-t bg-background">
              {mobileTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMobileTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMobileTab(tab.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div
              data-testid="pos-product-column"
              className="h-full min-w-0 flex-1 overflow-hidden"
            >
              {children}
            </div>
            <div
              data-testid="pos-cart-column"
              className="h-full w-[288px] shrink-0 border-l bg-card lg:w-[304px] xl:w-[340px]"
            >
              {cart}
            </div>
          </>
        )}
      </div>

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
            setSession({
              sessionId: null,
              timestampId: null,
              terminal: null,
              user: null,
            });
          }}
          onCancel={() => setShowCloseSession(false)}
        />
      )}
    </div>
  );
}
