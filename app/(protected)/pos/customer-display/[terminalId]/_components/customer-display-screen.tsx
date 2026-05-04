"use client";

import type {
  CustomerDisplayDTO,
  CustomerDisplayMetaDTO,
} from "../../../_services/_dto/customer-display.dto";
import { useCustomerDisplay } from "../../../_services/use-customer-display";
import { CustomerDisplayCart } from "./customer-display-cart";
import { CustomerDisplayCompleted } from "./customer-display-completed";
import { CustomerDisplayIdle } from "./customer-display-idle";
import { CustomerDisplayPayment } from "./customer-display-payment";

interface CustomerDisplayScreenProps {
  terminalId: string;
  meta: CustomerDisplayMetaDTO;
  initialDisplay: CustomerDisplayDTO;
}

export function CustomerDisplayScreen({
  terminalId,
  meta,
  initialDisplay,
}: CustomerDisplayScreenProps) {
  const { display, connectionState, isRefreshing } = useCustomerDisplay(
    terminalId,
    initialDisplay,
  );
  const updatedAt = new Date(display.updatedAt);

  return (
    <div className="fixed inset-0 z-[1000] flex h-dvh w-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-slate-200 bg-white px-8 py-5">
        <div className="min-w-0">
          <p className="truncate text-2xl font-black tracking-normal text-slate-950">
            {meta.storeName}
          </p>
          <p className="truncate text-lg font-semibold text-slate-500">
            {meta.terminalName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            {connectionState === "live"
              ? "Live"
              : isRefreshing
                ? "Refreshing"
                : "Connecting"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Updated {Number.isNaN(updatedAt.getTime()) ? "" : updatedAt.toLocaleTimeString()}
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden p-6">
        {display.status === "idle" ? (
          <CustomerDisplayIdle meta={meta} message={display.message} />
        ) : display.status === "payment" ? (
          <CustomerDisplayPayment display={display} />
        ) : display.status === "completed" ? (
          <CustomerDisplayCompleted display={display} />
        ) : (
          <CustomerDisplayCart display={display} />
        )}
      </main>
    </div>
  );
}
