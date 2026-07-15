import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const isPendingApproval = (await searchParams).mode === "pending";

  return (
    <AuthShell
      eyebrow={isPendingApproval ? "Request received" : "Check your email"}
      title={
        isPendingApproval
          ? "Your registration is awaiting approval."
          : "Confirm your email to finish registration."
      }
      description={
        isPendingApproval
          ? "An administrator must approve your request before you can log in."
          : "No admin approval is required. Open the verification message sent to your email before logging in."
      }
    >
      <div className="w-full max-w-md">
        <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
              {isPendingApproval
                ? "Administrator approval required"
                : "Email verification required"}
            </div>
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
              {isPendingApproval ? "Registration Request Submitted" : "Account Created"}
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              {isPendingApproval ? "Please wait for approval" : "Check your inbox"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm leading-7 text-muted-foreground">
              {isPendingApproval ? (
                <>
                  Your request was sent successfully. Return to login after an
                  administrator confirms that your account is ready.
                </>
              ) : (
                <>
                  Select <strong>Confirm email</strong> in the message from POSard.
                  After verification, log in using the email and password you registered.
                </>
              )}
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
