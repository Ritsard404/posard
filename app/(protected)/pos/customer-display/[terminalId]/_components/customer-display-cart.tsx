import type { CustomerDisplayDTO } from "../../../_services/_dto/customer-display.dto";

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value: number) {
  return `PHP ${moneyFormatter.format(value)}`;
}

interface CustomerDisplayCartProps {
  display: CustomerDisplayDTO;
}

export function CustomerDisplayCart({ display }: CustomerDisplayCartProps) {
  return (
    <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[1fr_26rem]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid shrink-0 grid-cols-[1fr_7rem_11rem] border-b border-slate-200 px-6 py-4 text-lg font-black uppercase tracking-[0.16em] text-slate-500">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {display.items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="grid grid-cols-[1fr_7rem_11rem] items-center border-b border-slate-100 px-6 py-5"
            >
              <div className="min-w-0">
                <p className="truncate text-3xl font-black text-slate-950">
                  {item.name}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-500">
                  {money(item.unitPrice)} each
                </p>
              </div>
              <p className="text-center text-4xl font-black text-slate-950">
                {item.qty}
              </p>
              <p className="text-right text-3xl font-black text-slate-950">
                {money(item.lineTotal)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col justify-end rounded-lg border border-slate-200 bg-slate-950 p-7 text-white">
        <div className="space-y-4 text-2xl font-bold">
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Subtotal</span>
            <span>{money(display.subtotal)}</span>
          </div>
          {display.discountTotal > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-300">
              <span>Discount</span>
              <span>-{money(display.discountTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Tax</span>
            <span>{money(display.taxTotal)}</span>
          </div>
        </div>
        <div className="mt-8 border-t border-white/20 pt-8">
          <p className="text-2xl font-black uppercase tracking-[0.18em] text-amber-300">
            Total Due
          </p>
          <p className="mt-3 text-6xl font-black tracking-normal lg:text-7xl">
            {money(display.totalDue)}
          </p>
        </div>
      </aside>
    </div>
  );
}
