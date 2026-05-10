import { Skeleton } from "@/components/ui/skeleton";

export default function AiReportsLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="rounded-lg border p-3">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-dashed p-4">
        <Skeleton className="h-5 w-72" />
      </div>
    </div>
  );
}
