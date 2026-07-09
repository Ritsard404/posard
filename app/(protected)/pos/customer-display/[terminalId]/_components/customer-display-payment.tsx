"use client";

import type { CustomerDisplayDTO } from "../../../_services/_dto/customer-display.dto";
import { StorageImage } from "@/components/storage/StorageImage";

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
  const details = display.paymentDetails;
  const detailsTitle =
    details?.providerName || details?.methodName || display.paymentMethod || "Reference payment";

  if (details) {
    return (
      <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-8">
          <p className="text-2xl font-black uppercase tracking-[0.2em] text-slate-500">
            Total Due
          </p>
          <p className="mt-4 text-7xl font-black tracking-normal text-slate-950 lg:text-8xl">
            {money(display.totalDue)}
          </p>
          <p className="mt-8 text-3xl font-bold text-slate-500">
            {display.paymentMethod || "Reference Payment"}
          </p>
        </section>

        <section className="flex min-h-0 flex-col justify-center rounded-lg bg-slate-950 p-8 text-white">
          <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1fr)] lg:items-center">
            <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-3">
              <StorageImage
                src={details.qrImageUrl}
                alt={`${detailsTitle} QR`}
                fill
                sizes="360px"
                className="object-contain p-3"
                fallback={<span className="px-6 text-center text-2xl font-bold text-slate-500">No QR image</span>}
              />
            </div>
            <div className="min-w-0 space-y-6">
              <div>
                <p className="text-2xl font-black uppercase tracking-[0.2em] text-amber-300">
                  Scan To Pay
                </p>
                <p className="mt-3 break-words text-5xl font-black tracking-normal">
                  {detailsTitle}
                </p>
              </div>
              {details.accountHolder ? (
                <div>
                  <p className="text-xl font-black uppercase tracking-[0.18em] text-slate-400">
                    Account Holder
                  </p>
                  <p className="mt-1 break-words text-4xl font-bold">
                    {details.accountHolder}
                  </p>
                </div>
              ) : null}
              {details.accountNumber ? (
                <div>
                  <p className="text-xl font-black uppercase tracking-[0.18em] text-slate-400">
                    Account Details
                  </p>
                  <p className="mt-1 break-words text-4xl font-bold">
                    {details.accountNumber}
                  </p>
                </div>
              ) : null}
              {details.instructions ? (
                <p className="rounded-2xl border border-white/15 bg-white/10 p-4 text-2xl font-semibold leading-snug text-slate-100">
                  {details.instructions}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  }

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
