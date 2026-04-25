import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Account created"
      title="Your POSard account is ready for review."
      description="The account was created successfully. An admin still needs to approve and activate it before you can sign in."
    >
      <div className="w-full max-w-md">
        <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
              Pending approval
            </div>
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
              Account Created
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              Waiting for admin activation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm leading-7 text-muted-foreground">
              Your merchant account has been submitted. Once an admin approves it,
              you can return and sign in to start using POSard.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
