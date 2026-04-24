import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <Skeleton className="h-7 w-28 rounded-full bg-primary/10" />
        <Skeleton className="mt-4 h-10 w-56 rounded-2xl bg-muted" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl rounded-full bg-muted" />
      </div>
      <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-24 rounded-2xl bg-muted" />
          <Skeleton className="h-11 w-24 rounded-2xl bg-muted" />
          <Skeleton className="h-11 w-24 rounded-2xl bg-muted" />
          <Skeleton className="h-11 w-24 rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-3xl bg-muted" />
        <Skeleton className="h-28 rounded-3xl bg-muted" />
        <Skeleton className="h-28 rounded-3xl bg-muted" />
        <Skeleton className="h-28 rounded-3xl bg-muted" />
      </div>
      <div className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <Skeleton className="h-40 rounded-[24px] bg-muted" />
      </div>
    </div>
  );
}
