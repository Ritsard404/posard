import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-32 rounded-full bg-primary/10" />
                <Skeleton className="h-7 w-28 rounded-full bg-muted" />
                <Skeleton className="h-7 w-24 rounded-full bg-muted" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-10 w-60 rounded-2xl bg-muted" />
                <Skeleton className="h-4 w-full max-w-2xl rounded-full bg-muted" />
                <Skeleton className="h-4 w-full max-w-xl rounded-full bg-muted" />
              </div>
            </div>

            <div className="space-y-3 xl:w-[280px]">
              <Skeleton className="h-12 w-full rounded-2xl bg-muted" />
              <Skeleton className="h-11 w-40 rounded-2xl bg-primary/10" />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Skeleton className="h-40 rounded-[26px] bg-primary/10" />
            <Skeleton className="h-40 rounded-[26px] bg-muted" />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <Skeleton className="mb-4 h-5 w-36 rounded-full bg-muted" />
          <Skeleton className="mb-6 h-4 w-full max-w-xl rounded-full bg-muted" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-32 rounded-[24px] bg-muted" />
            <Skeleton className="h-32 rounded-[24px] bg-muted" />
            <Skeleton className="h-32 rounded-[24px] bg-muted" />
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <Skeleton className="mb-4 h-5 w-24 rounded-full bg-muted" />
          <Skeleton className="mb-6 h-4 w-full max-w-lg rounded-full bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 rounded-3xl bg-muted" />
            <Skeleton className="h-28 rounded-3xl bg-muted" />
            <Skeleton className="h-28 rounded-3xl bg-muted" />
            <Skeleton className="h-28 rounded-3xl bg-muted" />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <Skeleton className="mb-4 h-5 w-24 rounded-full bg-muted" />
        <Skeleton className="mb-6 h-4 w-full max-w-md rounded-full bg-muted" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-11 rounded-2xl bg-muted" />
          <Skeleton className="h-11 rounded-2xl bg-muted" />
        </div>
      </div>

      <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <Skeleton className="mb-4 h-5 w-40 rounded-full bg-muted" />
        <Skeleton className="mb-6 h-4 w-full max-w-lg rounded-full bg-muted" />
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-[24px] bg-muted" />
          <Skeleton className="h-28 rounded-[24px] bg-muted" />
          <Skeleton className="h-28 rounded-[24px] bg-muted" />
        </div>
      </div>
    </div>
  );
}
