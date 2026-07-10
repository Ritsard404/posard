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

    setFeedback({ kind: "idle" });

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
      <Card className="rounded-[2rem] border border-white/10 bg-white/80 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Password update
          </div>
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
            Reset Your Password
          </CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
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
                  className="h-12 rounded-xl border-border/60 bg-background/70 shadow-sm"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>
              <AuthFeedback state={feedback} />
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold shadow-lg shadow-primary/20"
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
