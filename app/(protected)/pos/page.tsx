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
      <div className="relative flex w-full h-[calc(100vh-4rem)] items-center justify-center bg-background overflow-hidden">
        {/* Background blobs for loader too */}
        <div className="absolute top-0 -left-10 w-72 h-72 bg-accent/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
        <div className="absolute bottom-0 -right-10 w-72 h-72 bg-emerald-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
        
        <div className="relative z-10 glass-card p-10 flex flex-col items-center gap-4 border-white/5 animate-in fade-in zoom-in-95 duration-500">
          <div className="size-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
          <span className="text-muted-foreground font-heading font-bold tracking-widest uppercase text-xs">Loading POS Terminal</span>
        </div>
      </div>
    );
  }

  // If no active session, show the Terminal Selection & Open Modal flow
  if (!activeSessionId) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 -left-10 w-96 h-96 bg-accent/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
        <div className="absolute top-20 -right-10 w-96 h-96 bg-emerald-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
        <div className="absolute -bottom-20 left-40 w-96 h-96 bg-indigo-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>
        
        <div className="relative z-10">
          <TerminalSelection 
            onSelectTerminal={(id, name) => setSelectedTerminal({ id, name })} 
          />
        </div>

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
      </div>
    );
  }

  // Active Session Layout
  return (
    <>
      <HeaderActions>
        <CashTrackTrigger />
      </HeaderActions>
      <div className="relative flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 -left-10 w-96 h-96 bg-accent/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none"></div>
        <div className="absolute top-20 -right-10 w-96 h-96 bg-emerald-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
        
        {/* POS Header Bar */}
        <div className="relative z-20 flex-none h-16 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="size-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Monitor className="size-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold tracking-tight text-lg">{activeTerminal?.name}</span>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60 flex items-center gap-2">
                <span>{activeUser?.name || 'Cashier'}</span>
                <span className="size-1 rounded-full bg-muted-foreground/30" />
                <span className="text-accent/80">{activeUser?.role}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowWithdraw(true)} 
              className="h-10 px-4 rounded-xl border-white/5 bg-white/5 hover:bg-amber-500/10 hover:text-amber-500 transition-all font-bold group"
            >
              <Wallet className="size-4 mr-2 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Withdraw</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowCloseSession(true)}
              className="h-10 px-4 rounded-xl shadow-lg hover:shadow-destructive/20 font-bold"
            >
              <LogOut className="size-4 mr-2" />
              <span className="hidden sm:inline">End Session</span>
            </Button>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Products Section */}
          <div className={`flex-1 h-full overflow-hidden ${activeTab === 'products' ? 'block' : 'hidden md:block'}`}>
            <ProductDisplay />
          </div>
          
          {/* Cart Section */}
          <div className={`w-full md:w-[420px] xl:w-[480px] h-full shadow-2xl ${activeTab === 'cart' ? 'block' : 'hidden md:block'}`}>
            <CartPanel />
          </div>
        </div>

        {/* Bottom Nav Mobile */}
        <div className="md:hidden relative z-20 flex-none h-[72px] flex border-t border-white/10 bg-white/5 backdrop-blur-xl">
          <button 
            onClick={() => setActiveTab("products")} 
            className={`flex-1 flex flex-col items-center justify-center p-2 transition-all ${activeTab === "products" ? "text-accent" : "text-muted-foreground/60"}`}
          >
            <Package className={`h-6 w-6 mb-1 transition-transform ${activeTab === "products" ? "scale-110" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Inventory</span>
            {activeTab === "products" && <span className="absolute bottom-1 size-1 rounded-full bg-accent" />}
          </button>
          <button 
            onClick={() => setActiveTab("cart")} 
            className={`flex-1 flex flex-col items-center justify-center p-2 transition-all ${activeTab === "cart" ? "text-accent" : "text-muted-foreground/60"}`}
          >
            <div className="relative">
              <ShoppingCart className={`h-6 w-6 mb-1 transition-transform ${activeTab === "cart" ? "scale-110" : ""}`} />
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-destructive border-2 border-background" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Order</span>
            {activeTab === "cart" && <span className="absolute bottom-1 size-1 rounded-full bg-accent" />}
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
