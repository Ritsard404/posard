"use client";

import { useEffect, useState } from 'react';
import { ProductDisplay } from './_components/ProductDisplay';
import { CartPanel } from './_components/CartPanel';
import { ShoppingCart, Package, LogOut, Wallet, Monitor } from 'lucide-react';
import { fetchPOSMetaDataAction } from './_actions/pos.action';
import { getCurrentSessionAction } from './_actions/session.action';
import { usePOSStore } from './_store/pos-store';
import { TerminalSelection } from './_components/TerminalSelection';
import { OpenSessionModal } from './_components/OpenSessionModal';
import { WithdrawModal } from './_components/WithdrawModal';
import { CloseSessionModal } from './_components/CloseSessionModal';
import { Button } from '@/components/ui/button';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { CashTrackTrigger } from '@/components/layout/CashTrackTrigger';

export default function POSPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");
  
  // UI State for Modal handling
  const [selectedTerminal, setSelectedTerminal] = useState<{ id: string, name: string } | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);

  // Store Connections
  const setProducts = usePOSStore(state => state.setProducts);
  const setCategories = usePOSStore(state => state.setCategories);
  const setSession = usePOSStore(state => state.setSession);
  
  const activeSessionId = usePOSStore(state => state.activeSessionId);
  const activeTimestampId = usePOSStore(state => state.activeTimestampId);
  const activeTerminal = usePOSStore(state => state.activeTerminal);
  const activeUser = usePOSStore(state => state.activeUser);

  useEffect(() => {
    async function loadData() {
      const [metaRes, sessionRes] = await Promise.all([
        fetchPOSMetaDataAction(),
        getCurrentSessionAction()
      ]);

      if (metaRes.success) {
        setProducts(metaRes.data.products);
        setCategories(metaRes.data.categories);
      } else {
        console.error("Failed to load POS metadata:", metaRes.error);
      }

      if (sessionRes.success && sessionRes.data) {
        setSession(sessionRes.data);
      } else {
        setSession({ sessionId: null, timestampId: null, terminal: null, user: null });
      }

      setMounted(true);
      setLoading(false);
    }
    
    loadData();
  }, [setProducts, setCategories, setSession]);

  if (!mounted || loading) {
    return (
      <div className="flex w-full h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 rounded-full border-b-2 border-primary mr-3"></div>
        <span className="text-muted-foreground font-medium">Loading POS Data...</span>
      </div>
    );
  }

  // If no active session, show the Terminal Selection & Open Modal flow
  if (!activeSessionId) {
    return (
      <>
        <TerminalSelection 
          onSelectTerminal={(id, name) => setSelectedTerminal({ id, name })} 
        />
        {selectedTerminal && (
          <OpenSessionModal
            terminalId={selectedTerminal.id}
            terminalName={selectedTerminal.name}
            onSuccess={(data) => {
              setSession({
                sessionId: data.sessionId,
                timestampId: data.timestampId,
                terminal: selectedTerminal,
                user: data.user
              });
              setSelectedTerminal(null);
            }}
            onCancel={() => setSelectedTerminal(null)}
          />
        )}
      </>
    );
  }

  // Active Session Layout
  return (
    <>
      <HeaderActions>
        <CashTrackTrigger />
      </HeaderActions>
      <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-muted/10">
        
        {/* POS Header Bar */}
        <div className="flex-none h-14 bg-background border-b flex items-center justify-between px-4 z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <Monitor className="w-5 h-5 text-primary" />
            <span className="font-semibold">{activeTerminal?.name}</span>
            <span className="hidden md:inline text-muted-foreground text-sm pl-3 border-l border-muted">
              {activeUser?.name || 'Cashier'} 
              <span className="opacity-60 ml-1">({activeUser?.role})</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowWithdraw(true)} className="text-amber-600 border-amber-600 hover:bg-amber-50">
              <Wallet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Withdraw Cash</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowCloseSession(true)}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Close Session</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Products Section */}
          <div className={`flex-1 h-full overflow-hidden ${activeTab === 'products' ? 'block' : 'hidden md:block'}`}>
            <ProductDisplay />
          </div>
          
          {/* Cart Section */}
          <div className={`w-full md:w-[400px] xl:w-[450px] h-full border-t md:border-t-0 md:border-l ${activeTab === 'cart' ? 'block' : 'hidden md:block'}`}>
            <CartPanel />
          </div>
        </div>

        {/* Bottom Nav Mobile */}
        <div className="md:hidden flex-none h-[60px] flex border-t bg-background z-10">
          <button 
            onClick={() => setActiveTab("products")} 
            className={`flex-1 flex flex-col items-center justify-center p-2 transition-colors ${activeTab === "products" ? "text-primary border-t-2 border-primary" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <Package className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Products</span>
          </button>
          <button 
            onClick={() => setActiveTab("cart")} 
            className={`flex-1 flex flex-col items-center justify-center p-2 transition-colors ${activeTab === "cart" ? "text-primary border-t-2 border-primary" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <ShoppingCart className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Cart</span>
          </button>
        </div>
      </div>

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
            // On success, reset the session so it goes back to terminal selection
            setSession({ sessionId: null, timestampId: null, terminal: null, user: null });
          }}
          onCancel={() => setShowCloseSession(false)}
        />
      )}
    </>
  );
}
