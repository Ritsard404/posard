import type { CustomerDisplayMetaDTO } from "../../../_services/_dto/customer-display.dto";

interface CustomerDisplayIdleProps {
  meta: CustomerDisplayMetaDTO;
  message: string | null | undefined;
}

export function CustomerDisplayIdle({ meta, message }: CustomerDisplayIdleProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      {meta.logoImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.logoImageUrl}
          alt={meta.storeName}
          width={256}
          height={112}
          loading="eager"
          className="max-h-28 max-w-64 object-contain"
        />
      ) : (
        <div className="flex size-28 items-center justify-center rounded-2xl border border-slate-200 bg-white text-5xl font-black text-slate-900 shadow-sm">
          {meta.storeName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="space-y-3">
        <p className="text-3xl font-black uppercase tracking-[0.22em] text-slate-500">
          {meta.storeName}
        </p>
        <h2 className="text-6xl font-black tracking-normal text-slate-950 lg:text-7xl">
          {message || "Ready for next customer"}
        </h2>
        <p className="text-2xl font-semibold text-slate-500">
          {meta.terminalName}
        </p>
      </div>
    </div>
  );
}
