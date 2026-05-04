import { CheckCircle2 } from "lucide-react";
import type { CustomerDisplayDTO } from "../../../_services/_dto/customer-display.dto";

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value: number | null | undefined) {
  return `PHP ${moneyFormatter.format(value ?? 0)}`;
}

interface CustomerDisplayCompletedProps {
  display: CustomerDisplayDTO;
}

export function CustomerDisplayCompleted({
  display,
}: CustomerDisplayCompletedProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <div className="flex size-28 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="size-16" />
      </div>
      <div>
        <p className="text-3xl font-black uppercase tracking-[0.2em] text-emerald-700">
          Payment Successful
        </p>
        <h2 className="mt-4 text-7xl font-black tracking-normal text-slate-950 lg:text-8xl">
          Thank you
        </h2>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xl font-black uppercase tracking-[0.18em] text-slate-500">
            Total Paid
          </p>
          <p className="mt-3 text-5xl font-black text-slate-950">
            {money(display.cashReceived && display.cashReceived > 0 ? display.cashReceived : display.totalDue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xl font-black uppercase tracking-[0.18em] text-slate-500">
            Change
          </p>
          <p className="mt-3 text-5xl font-black text-slate-950">
            {money(display.change)}
          </p>
        </div>
      </div>
      <p className="max-w-4xl text-3xl font-semibold text-slate-500">
        {display.message || "Please come again."}
      </p>
    </div>
  );
}
