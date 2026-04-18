"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { AuthFeedback, type AuthFeedbackState } from "@/components/auth-feedback";
import { AuthSubmitButton } from "@/components/auth-submit-button";
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
        <Card className="glass-card border-white/5 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight text-emerald-500">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
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
              <Button className="w-full h-11 rounded-xl font-bold glow-on-hover shadow-lg">
                Proceed to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-white/5 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">
              Reset Password
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              We&apos;ll send a secure link to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    className="h-12 rounded-xl bg-background/50 border-white/10"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFeedback();
                    }}
                  />
                </div>
                <AuthFeedback state={feedback} />
                <AuthSubmitButton
                  className="h-12 w-full rounded-xl font-bold glow-on-hover"
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
