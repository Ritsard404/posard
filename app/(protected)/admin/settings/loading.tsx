import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <div className="rounded-lg border p-4">
        <Skeleton className="mb-4 h-5 w-36" />
        <div className="rounded-lg border p-4">
          <Skeleton className="mb-2 h-5 w-64" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="mt-4 h-10 w-36" />
      </div>
    </div>
  );
}
