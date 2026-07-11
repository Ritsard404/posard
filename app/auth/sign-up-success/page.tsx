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
      eyebrow="Check your email"
      title="Confirm your email to finish registration."
      description="No admin approval is required. Open the verification message sent to your email before logging in."
    >
      <div className="w-full max-w-md">
        <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
              Email verification required
            </div>
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
              Account Created
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              Check your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm leading-7 text-muted-foreground">
              Select <strong>Confirm email</strong> in the message from POSard.
              After verification, log in using the email and password you registered.
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
