"use client";

import { useState, useTransition } from "react";
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

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<AuthFeedbackState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const clearFeedback = () => {
    if (feedback.kind !== "idle") {
      setFeedback({ kind: "idle" });
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      return;
    }

    setFeedback({ kind: "pending", message: "Saving your new password..." });

    startTransition(async () => {
      const supabase = createClient();

      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

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
      <Card className="glass-card border-white/5 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} aria-busy={isPending}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
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
              <AuthFeedback state={feedback} />
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold glow-on-hover"
                isPending={isPending}
                idleLabel="Save New Password"
                pendingLabel="Saving new password..."
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
