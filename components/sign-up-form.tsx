"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthFeedback, type AuthFeedbackState } from "@/components/auth-feedback";
import { AuthSubmitButton } from "@/components/auth-submit-button";
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

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [feedback, setFeedback] = useState<AuthFeedbackState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const clearFeedback = () => {
    if (feedback.kind !== "idle") {
      setFeedback({ kind: "idle" });
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      return;
    }

    if (password !== repeatPassword) {
      setFeedback({ kind: "error", message: "Passwords do not match" });
      return;
    }

    setFeedback({ kind: "pending", message: "Creating your account..." });

    startTransition(async () => {
      const supabase = createClient();

      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        router.push("/auth/sign-up-success");
      } catch (error: unknown) {
        setFeedback({
          kind: "error",
          message:
            error instanceof Error ? error.message : JSON.stringify(error),
        });
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="glass-card border-white/5">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">
            Sign up
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Create your merchant account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} aria-busy={isPending}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label
                  htmlFor="full-name"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Full Name
                </Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Juan dela Cruz"
                  required
                  value={fullName}
                  disabled={isPending}
                  aria-disabled={isPending}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Email Address
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
              <div className="grid gap-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  disabled={isPending}
                  aria-disabled={isPending}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="repeat-password"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Repeat Password
                </Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  disabled={isPending}
                  aria-disabled={isPending}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => {
                    setRepeatPassword(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>

              <AuthFeedback state={feedback} />
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold glow-on-hover"
                isPending={isPending}
                idleLabel="Create My Merchant Account"
                pendingLabel="Creating your account..."
              />
            </div>
            <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Already have an account?{" "}
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
    </div>
  );
}
