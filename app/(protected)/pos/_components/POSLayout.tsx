"use client";

import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Package, ShoppingCart, Wallet, LogOut, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { CashTrackTrigger } from "@/components/layout/CashTrackTrigger";
import { usePOSStore } from "../_store/pos-store";
import { cn } from "@/lib/utils";
import { WithdrawModal } from "./WithdrawModal";
import { CloseSessionModal } from "./CloseSessionModal";

interface POSLayoutProps {
  children: React.ReactNode;
  cart: React.ReactNode;
}

export function POSLayout({ children, cart }: POSLayoutProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");
  
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);

  const activeTerminal = usePOSStore(state => state.activeTerminal);
  const activeUser = usePOSStore(state => state.activeUser);
  const activeTimestampId = usePOSStore(state => state.activeTimestampId);
  const activeSessionId = usePOSStore(state => state.activeSessionId);
  const setSession = usePOSStore(state => state.setSession);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <HeaderActions>
        <div className="flex items-center gap-2">
          <CashTrackTrigger />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowWithdraw(true)}
            className="hidden sm:flex h-9 rounded-lg border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold"
          >
            <Wallet className="size-4 mr-2" />
            Withdraw
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowCloseSession(true)}
            className="hidden sm:flex h-9 rounded-lg font-bold"
          >
            <LogOut className="size-4 mr-2" />
            Close
          </Button>
        </div>
      </HeaderActions>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Products Section */}
        <div className={cn(
          "flex-1 h-full overflow-hidden transition-all duration-300",
          isMobile && activeTab !== "products" && "hidden",
          !isMobile && "block"
        )}>
          {children}
        </div>

        {/* Desktop Cart Sidebar */}
        {!isMobile && (
          <div className="w-[380px] xl:w-[420px] h-full border-l bg-card/50 backdrop-blur-sm">
            {cart}
          </div>
        )}

        {/* Mobile Cart Tab */}
        {isMobile && activeTab === "cart" && (
          <div className="absolute inset-0 z-10 bg-background">
            {cart}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="flex h-16 border-t bg-card/80 backdrop-blur-lg items-center px-4">
          <button
            onClick={() => setActiveTab("products")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              activeTab === "products" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <LayoutGrid className="size-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Items</span>
          </button>
          
          <button
            onClick={() => setActiveTab("cart")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              activeTab === "cart" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <ShoppingCart className="size-5" />
              {/* Badge can be added here if needed */}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Cart</span>
          </button>

          <button
            onClick={() => setShowCloseSession(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-destructive"
          >
            <LogOut className="size-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Exit</span>
          </button>
        </div>
      )}

      {/* Modals */}
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
