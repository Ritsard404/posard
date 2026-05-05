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
    <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_4rem_8rem] border-b border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-[minmax(0,1fr)_5rem_9rem]">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {display.items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="grid min-h-8 grid-cols-[minmax(0,1fr)_4rem_8rem] items-center border-b border-slate-100 px-4 py-1.5 sm:grid-cols-[minmax(0,1fr)_5rem_9rem]"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-black leading-tight text-slate-950 xl:text-lg">
                  {item.name}
                </p>
                <p className="text-xs font-semibold leading-tight text-slate-500 xl:text-sm">
                  {money(item.unitPrice)} each
                </p>
              </div>
              <p className="text-center text-lg font-black text-slate-950 xl:text-xl">
                {item.qty}
              </p>
              <p className="text-right text-base font-black text-slate-950 xl:text-lg">
                {money(item.lineTotal)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col justify-end rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
        <div className="space-y-2 text-base font-bold xl:text-lg">
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
        <div className="mt-4 border-t border-white/20 pt-4">
          <p className="text-base font-black uppercase tracking-[0.16em] text-amber-300 xl:text-lg">
            Total Due
          </p>
          <p className="mt-2 break-words text-4xl font-black tracking-normal xl:text-5xl">
            {money(display.totalDue)}
          </p>
        </div>
      </aside>
    </div>
  );
}
