import type { CustomerDisplayDTO } from "../../../_services/_dto/customer-display.dto";

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value: number | null | undefined) {
  return `PHP ${moneyFormatter.format(value ?? 0)}`;
}

interface CustomerDisplayPaymentProps {
  display: CustomerDisplayDTO;
}

export function CustomerDisplayPayment({ display }: CustomerDisplayPaymentProps) {
  return (
    <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-8">
        <p className="text-2xl font-black uppercase tracking-[0.2em] text-slate-500">
          Total Due
        </p>
        <p className="mt-4 text-7xl font-black tracking-normal text-slate-950 lg:text-8xl">
          {money(display.totalDue)}
        </p>
        <p className="mt-8 text-3xl font-bold text-slate-500">
          {display.paymentMethod || "Select payment method"}
        </p>
      </section>

      <section className="flex flex-col justify-center rounded-lg bg-slate-950 p-8 text-white">
        <div className="space-y-8">
          <div>
            <p className="text-2xl font-black uppercase tracking-[0.2em] text-slate-400">
              Cash Received
            </p>
            <p className="mt-2 text-6xl font-black tracking-normal">
              {money(display.cashReceived)}
            </p>
          </div>
          <div className="border-t border-white/20 pt-8">
            <p className="text-2xl font-black uppercase tracking-[0.2em] text-amber-300">
              Change
            </p>
            <p className="mt-2 text-7xl font-black tracking-normal text-amber-200">
              {money(display.change)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
