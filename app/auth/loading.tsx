import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AuthShell
      eyebrow="Loading"
      title="Preparing your secure workspace."
      description="POSard is loading the auth experience and your next account action."
    >
      <div className="w-full max-w-md">
        <Card className="rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <Skeleton className="mx-auto h-11 w-11 rounded-2xl" />
            <Skeleton className="mx-auto h-8 w-40 rounded-xl" />
            <Skeleton className="mx-auto h-4 w-56 rounded-full" />
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
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
