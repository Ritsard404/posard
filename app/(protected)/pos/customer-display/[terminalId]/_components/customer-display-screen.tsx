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
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-normal text-slate-950 sm:text-xl">
            {meta.storeName}
          </p>
          <p className="truncate text-sm font-semibold text-slate-500 sm:text-base">
            {meta.terminalName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            {connectionState === "live"
              ? "Live"
              : isRefreshing
                ? "Refreshing"
                : "Connecting"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Updated {Number.isNaN(updatedAt.getTime()) ? "" : updatedAt.toLocaleTimeString()}
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
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
