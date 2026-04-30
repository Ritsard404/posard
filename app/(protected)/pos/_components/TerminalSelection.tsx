"use client";

import { useEffect, useState } from "react";
import { getTerminalsAction } from "../_actions/session.action";
import type { PrinterConfigDto } from "../_services/_dto/print.dto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MonitorSmartphone } from "lucide-react";

interface Terminal {
  id: string;
  posName: string;
  isActive: boolean;
  billingLocked?: boolean;
  billingMessage?: string | null;
  vat: number;
  discountCapType: "amount" | "percent";
  discountMax: number;
  printerConfig?: PrinterConfigDto | null;
  sessions: {
    profile: {
      fullName: string | null;
    }
  }[];
}

interface TerminalSelectionProps {
  onSelectTerminal: (
    terminalId: string,
    terminalName: string,
    vat: number,
    discountCapType: "amount" | "percent",
    discountMax: number,
    printerConfig?: PrinterConfigDto | null,
  ) => void;
}

export function TerminalSelection({ onSelectTerminal }: TerminalSelectionProps) {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTerminals() {
      const res = await getTerminalsAction();
      if (res.success && res.data) {
        setTerminals(res.data);
      } else {
        setError(res.error || "Failed to load terminals");
      }
      setLoading(false);
    }
    loadTerminals();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading terminals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full bg-background">
        <p className="text-destructive font-semibold">{error}</p>
      </div>
    );
  }

  if (terminals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full bg-background">
        <p className="text-muted-foreground">No terminals configured for this company.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] items-center overflow-y-auto w-full">
      <div className="w-full max-w-5xl py-16 px-6 md:px-8">
        <div className="mb-14 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-heading font-extrabold tracking-tight">Select POS Terminal</h1>
          <p className="text-muted-foreground font-medium mt-3">Ready for business. Choose an available workstation to start your session.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {terminals.map((t, idx) => (
            <div 
              key={t.id} 
              className="animate-in fade-in slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <Card 
                className={`group relative overflow-hidden glass-card p-2 border-white/5 transition-all duration-300 ${t.isActive || t.billingLocked ? "opacity-60 grayscale-[0.5]" : "hover:scale-[1.03] active:scale-[0.98] cursor-pointer hover:border-accent/30 hover:shadow-2xl group-hover:shadow-accent/5"}`}
                onClick={() =>
                  !t.isActive &&
                  !t.billingLocked &&
                  onSelectTerminal(
                    t.id,
                    t.posName,
                    t.vat,
                    t.discountCapType,
                    Number(t.discountMax),
                    t.printerConfig ?? null,
                  )
                }
              >
                <CardHeader className="flex flex-row items-center gap-5 pb-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${t.isActive ? "bg-white/5 border-white/10" : "bg-accent/10 text-accent border-accent/20 group-hover:bg-accent group-hover:text-white"}`}>
                    <MonitorSmartphone className="size-7" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="font-heading font-bold text-xl truncate">{t.posName}</CardTitle>
                    <div className="mt-1">
                      {t.isActive ? (
                        <span className="text-destructive font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <span className="size-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> 
                          In Use
                        </span>
                      ) : t.billingLocked ? (
                        <span className="text-amber-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]" />
                          Subscription Locked
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" /> 
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-20 flex flex-col justify-center">
                    {t.isActive && t.sessions?.[0] ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Current Cashier</p>
                        <p className="font-bold text-sm text-foreground truncate">{t.sessions[0].profile.fullName || "Unknown Staff"}</p>
                      </div>
                    ) : t.billingLocked ? (
                      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                          Billing Restriction
                        </p>
                        <p className="text-sm font-medium text-amber-950">
                          {t.billingMessage ?? "Subscription is not active for this terminal."}
                        </p>
                      </div>
                    ) : (
                      <div className="px-1">
                        <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
                          Securely access this terminal to manage inventory and process customer transactions.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className={`w-full mt-6 h-12 rounded-xl font-bold transition-all ${t.isActive || t.billingLocked ? "bg-white/5 text-muted-foreground border-white/5" : "bg-primary hover:bg-primary/90 glow-on-hover"}`} 
                    disabled={t.isActive || t.billingLocked}
                    variant={t.isActive || t.billingLocked ? "secondary" : "default"}
                  >
                    {t.isActive
                      ? "Terminal Locked"
                      : t.billingLocked
                        ? "Subscription Required"
                        : "Initialize Session"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
