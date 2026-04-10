"use client";

import { useEffect, useState } from "react";
import { getTerminalsAction } from "../_actions/session.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MonitorSmartphone } from "lucide-react";

interface Terminal {
  id: string;
  posName: string;
  isActive: boolean;
  sessions: {
    profile: {
      fullName: string | null;
    }
  }[];
}

interface TerminalSelectionProps {
  onSelectTerminal: (terminalId: string, terminalName: string) => void;
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20 items-center overflow-y-auto">
      <div className="w-full max-w-5xl py-12 px-4 md:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Select POS Terminal</h1>
          <p className="text-muted-foreground mt-2">Choose an available terminal to start your session.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terminals.map((t) => (
            <Card 
              key={t.id} 
              className={`transition-all ${t.isActive ? "opacity-75 relative overflow-hidden" : "hover:border-primary cursor-pointer hover:shadow-md"}`}
              onClick={() => !t.isActive && onSelectTerminal(t.id, t.posName)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-3 rounded-xl ${t.isActive ? "bg-muted" : "bg-primary/10 text-primary"}`}>
                  <MonitorSmartphone className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle>{t.posName}</CardTitle>
                  <CardDescription className="mt-1">
                    {t.isActive ? (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-destructive" /> In Use
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                      </span>
                    )}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {t.isActive && t.sessions?.[0] ? (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                    Currently operated by: <strong className="text-foreground">{t.sessions[0].profile.fullName || "Unknown"}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click to select and open session.
                  </p>
                )}
                <Button 
                  className="w-full mt-4" 
                  disabled={t.isActive}
                  variant={t.isActive ? "secondary" : "default"}
                >
                  {t.isActive ? "Terminal Locked" : "Select Terminal"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
