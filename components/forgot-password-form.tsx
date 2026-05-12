"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { AuthFeedback, type AuthFeedbackState } from "@/components/auth-feedback";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { checkPasswordResetRateLimitAction } from "@/app/auth/_actions/auth-security.action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const clearFeedback = () => {
    if (feedback.kind !== "idle") {
      setFeedback({ kind: "idle" });
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      return;
    }

    setFeedback({ kind: "pending", message: "Sending reset link..." });

    startTransition(async () => {
      const supabase = createClient();

      try {
        const rateLimit = await checkPasswordResetRateLimitAction();
        if (!rateLimit.success) {
          throw new Error(rateLimit.error);
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;

        setFeedback({
          kind: "success",
          message: "Reset link sent. Check your inbox for the next step.",
        });
        setSuccess(true);
      } catch (error: unknown) {
        setFeedback({
          kind: "error",
          message: error instanceof Error ? error.message : "An error occurred",
        });
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">
              Email sent
            </div>
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight text-emerald-600 md:text-4xl">
              Check Your Email
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              Password reset link sent
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a secure password reset link to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
              Open the email and follow the link to set a new password.
            </p>
            <AuthFeedback state={feedback} />
            <Link href="/auth/login">
              <Button className="h-11 w-full rounded-xl font-bold shadow-lg shadow-primary/20">
                Proceed to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Account recovery
            </div>
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
              Reset Password
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              We&apos;ll send a secure link to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <form onSubmit={handleForgotPassword} aria-busy={isPending}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Registered Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    disabled={isPending}
                    aria-disabled={isPending}
                    className="h-12 rounded-xl border-border/60 bg-background/70 shadow-sm"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFeedback();
                    }}
                  />
                </div>
                <AuthFeedback state={feedback} />
                <AuthSubmitButton
                  className="h-12 w-full rounded-xl font-bold shadow-lg shadow-primary/20"
                  isPending={isPending}
                  idleLabel="Send Reset Link"
                  pendingLabel="Sending reset link..."
                />
              </div>
              <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
                Remembered your password?{" "}
                <Link
                  href="/auth/login"
                  className="text-accent font-bold hover:underline underline-offset-4"
                >
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
