import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      {params?.error ? (
        <p className="text-sm leading-7 text-muted-foreground">
          Code error: {params.error}
        </p>
      ) : (
        <p className="text-sm leading-7 text-muted-foreground">
          An unspecified error occurred.
        </p>
      )}
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthShell
      eyebrow="Authentication error"
      title="Something interrupted the sign-in flow."
      description="POSard could not finish the auth step. Review the error details below, then retry the action."
    >
      <div className="w-full max-w-md">
        <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-destructive">
              Auth failed
            </div>
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
              Sorry, something went wrong.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
