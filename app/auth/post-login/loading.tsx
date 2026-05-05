import { Monitor } from "lucide-react";

export default function PostLoginLoading() {
  return (
    <div className="flex h-svh min-h-0 flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border bg-card p-8 shadow-xl animate-in fade-in zoom-in-95 duration-500 sm:p-10">
        <div className="relative size-20">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-primary/10">
            <Monitor className="size-6 animate-pulse text-primary" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-foreground">
            Restoring Session
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Opening your POS workspace...
          </span>
        </div>
      </div>
    </div>
  );
}
