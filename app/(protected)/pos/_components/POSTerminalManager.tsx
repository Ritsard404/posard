"use client";

import { useEffect, useState } from 'react';
import { usePOSStore } from '../_store/pos-store';
import { fetchPOSMetaDataAction } from '../_actions/pos.action';
import { getCurrentSessionAction } from '../_actions/session.action';
import { TerminalSelection } from './TerminalSelection';
import { OpenSessionModal } from './OpenSessionModal';
import { POSLayout } from './POSLayout';
import { ProductDisplay } from './ProductDisplay';
import { CartPanel } from './CartPanel';
import { Monitor } from 'lucide-react';

export function POSTerminalManager() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<{ id: string, name: string, vat: number } | null>(null);

  const { setProducts, setCategories, setSession, activeSessionId } = usePOSStore();

  useEffect(() => {
    async function loadData() {
      try {
        const [metaRes, sessionRes] = await Promise.all([
          fetchPOSMetaDataAction(),
          getCurrentSessionAction()
        ]);

        if (metaRes.success) {
          setProducts(metaRes.data.products);
          setCategories(metaRes.data.categories);
        }

        if (sessionRes.success && sessionRes.data) {
          setSession(sessionRes.data);
        } else {
          setSession({ sessionId: null, timestampId: null, terminal: null, user: null });
        }
      } catch (error) {
        console.error("Failed to load POS data:", error);
      } finally {
        setMounted(true);
        setLoading(false);
      }
    }
    
    loadData();
  }, [setProducts, setCategories, setSession]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] bg-background">
        <div className="relative flex flex-col items-center gap-6 p-12 rounded-3xl bg-card border shadow-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="relative size-20">
             <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
             <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
               <Monitor className="size-6 text-primary animate-pulse" />
             </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold tracking-widest uppercase text-foreground">Initializing</span>
            <span className="text-xs text-muted-foreground font-medium">Loading POS Terminal...</span>
          </div>
        </div>
      </div>
    );
  }

  // If no active session, show terminal selection
  if (!activeSessionId) {
    return (
      <div className="relative min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center p-4">
        <TerminalSelection 
          onSelectTerminal={(id, name, vat) => setSelectedTerminal({ id, name, vat })} 
        />

        {selectedTerminal && (
          <OpenSessionModal
            terminalId={selectedTerminal.id}
            terminalName={selectedTerminal.name}
            onSuccess={(data) => {
              setSession({
                sessionId: data.sessionId,
                timestampId: data.timestampId,
                terminal: { id: selectedTerminal.id, name: selectedTerminal.name, vat: selectedTerminal.vat },
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

  // Active Session
  return (
    <POSLayout cart={<CartPanel />}>
      <ProductDisplay />
    </POSLayout>
  );
}
