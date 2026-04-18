import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="glass-card border-white/5 shadow-2xl">
          <CardHeader className="space-y-3">
            <Skeleton className="mx-auto h-8 w-32 rounded-xl" />
            <Skeleton className="mx-auto h-4 w-52 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="mx-auto h-4 w-40 rounded-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
