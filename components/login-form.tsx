"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getRegistrationRequestLoginStatusAction } from "@/app/auth/_actions/registration-request.action";
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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setError(null);

    startTransition(async () => {
      const supabase = createClient();

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const requestStatus = await getRegistrationRequestLoginStatusAction({
            email,
          });

          if (requestStatus.success && requestStatus.data.status === "pending") {
            throw new Error(
              "Registration request submitted. Please wait for admin approval.",
            );
          }

          if (requestStatus.success && requestStatus.data.status === "rejected") {
            throw new Error(
              requestStatus.data.rejectionReason
                ? `Registration request was rejected: ${requestStatus.data.rejectionReason}`
                : "Registration request was rejected. Contact an admin for details.",
            );
          }

          throw error;
        }

        const userId = data?.user?.id;
        if (!userId) throw new Error("Could not get logged in user id");

        const profileResult = await supabase
          .from("profiles")
          .select("status,role")
          .eq("user_id", userId)
          .single();

        if (profileResult.error || !profileResult.data) {
          await supabase.auth.signOut();
          throw new Error(
            "User profile not found or unauthorized => " +
              (profileResult.error?.message ?? ""),
          );
        }

        if (profileResult.data.status !== "active") {
          await supabase.auth.signOut();
          throw new Error(
            "Account is pending approval or disabled. Contact an admin.",
          );
        }

        router.push("/dashboard");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:bg-card/94">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Secure sign in
          </div>
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
            Login
          </CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            Enter your credentials to access your terminal
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <form onSubmit={handleLogin} aria-busy={isPending}>
            <div className="flex flex-col gap-6">
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
                  placeholder="name@company.com"
                  required
                  value={email}
                  disabled={isPending}
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
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
                  placeholder="*******"
                  value={password}
                  disabled={isPending}
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div className="-mt-2 text-right text-sm font-medium">
                <Link
                  href="/auth/forgot-password"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              {error && (
                <p className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold shadow-lg shadow-primary/20"
                isPending={isPending}
                idleLabel="Login"
                pendingLabel="Signing you in..."
              />
            </div>
            <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="font-bold text-primary hover:underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
