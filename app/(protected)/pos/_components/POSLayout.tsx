"use client";

import React, { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutGrid,
  LogOut,
  Maximize2,
  MoreHorizontal,
  Minimize2,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { CashTrackTrigger } from "@/components/layout/CashTrackTrigger";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePOSStore } from "../_store/pos-store";
import { cn } from "@/lib/utils";
import { WithdrawModal } from "./WithdrawModal";
import { CloseSessionModal } from "./CloseSessionModal";
import { formatCurrency, usePOSPaymentSummary } from "./checkout-shared";

interface POSLayoutProps {
  children: React.ReactNode;
  cart: React.ReactNode;
  tender: React.ReactNode;
}

export function POSLayout({ children, cart, tender }: POSLayoutProps) {
  const isMobile = useIsMobile();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeTimestampId = usePOSStore((state) => state.activeTimestampId);
  const activeSessionId = usePOSStore((state) => state.activeSessionId);
  const activeTerminalId = usePOSStore((state) => state.activeTerminal?.id ?? null);
  const setSession = usePOSStore((state) => state.setSession);
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

  return (
    <div className="flex h-[calc(100dvh-5rem)] w-full max-w-full flex-col overflow-hidden bg-background lg:h-[calc(100dvh-5.5rem)]">
      <HeaderActions>
        <div className="flex items-center gap-2">
          <CashTrackTrigger />
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleFullscreen}
            className="h-9 rounded-lg px-3"
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? "Exit" : "Fullscreen"}
            </span>
            <span className="sm:hidden">{isFullscreen ? "Exit" : "Full"}</span>
          </Button>
          {isMobile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileActionsOpen(true)}
              className="h-9 rounded-lg"
            >
              <MoreHorizontal className="size-4" />
              More
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWithdraw(true)}
                className="hidden h-9 rounded-lg sm:flex"
              >
                <Wallet className="size-4 mr-2" />
                Withdraw
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCloseSession(true)}
                className="hidden h-9 rounded-lg sm:flex"
              >
                <LogOut className="size-4 mr-2" />
                Close
              </Button>
            </>
          )}
        </div>
      </HeaderActions>

      <div className="flex min-h-0 flex-1 overflow-hidden">
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
            <div className="h-full min-w-0 flex-1 overflow-hidden">{children}</div>
            <div className="h-full w-[320px] shrink-0 border-l bg-card xl:w-[360px]">
              {cart}
            </div>
          </>
        )}
      </div>

      <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem]">
          <SheetHeader>
            <SheetTitle>Session Actions</SheetTitle>
            <SheetDescription>
              Manage register-level actions without leaving the cashier flow.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4 pb-6">
            <Button
              variant="outline"
              className="h-12 justify-start rounded-xl"
              onClick={() => {
                setMobileActionsOpen(false);
                setShowWithdraw(true);
              }}
            >
              <Wallet className="size-4 mr-2" />
              Withdraw Cash
            </Button>
            <Button
              variant="destructive"
              className="h-12 justify-start rounded-xl"
              onClick={() => {
                setMobileActionsOpen(false);
                setShowCloseSession(true);
              }}
            >
              <LogOut className="size-4 mr-2" />
              Close Session
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {showWithdraw && activeTimestampId && (
        <WithdrawModal
          timestampId={activeTimestampId}
          onSuccess={() => setShowWithdraw(false)}
          onCancel={() => setShowWithdraw(false)}
        />
      )}

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
