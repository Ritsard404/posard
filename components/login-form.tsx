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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<AuthFeedbackState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const clearFeedback = () => {
    if (feedback.kind !== "idle") {
      setFeedback({ kind: "idle" });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      return;
    }

    setFeedback({ kind: "pending", message: "Signing you in..." });

    startTransition(async () => {
      const supabase = createClient();

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const userId = data?.user?.id;
        if (!userId) {
          throw new Error("Could not get logged in user id");
        }

        const profileResult = await supabase
          .from("profiles")
          .select("status,role")
          .eq("user_id", userId)
          .single();

        if (profileResult.error || !profileResult.data) {
          await supabase.auth.signOut();
          throw new Error(
            "User profile not found or unauthorized =>" +
              (profileResult.error?.message || ""),
          );
        }

        if (profileResult.data.status !== "active") {
          await supabase.auth.signOut();
          throw new Error(
            "Account is pending approval or disabled. Contact an admin.",
          );
        }

        router.push("/dashboard");
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
      <Card className="glass-card border-white/5">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">
            Login
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Enter your credentials to access your terminal
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  aria-disabled={isPending}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="*******"
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
              {/* <AuthFeedback state={feedback} /> */}
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold glow-on-hover"
                isPending={isPending}
                idleLabel="Login"
                pendingLabel="Signing you in..."
              />
            </div>
            <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="text-accent font-bold hover:underline underline-offset-4"
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
