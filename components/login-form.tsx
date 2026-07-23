"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Chrome, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getRegistrationRequestLoginStatusAction } from "@/app/auth/_actions/registration-request.action";
import { checkLoginRateLimitAction } from "@/app/auth/_actions/auth-security.action";
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

type LoginDestinationResponse = {
  destination?: string;
  error?: string;
};

const LOGIN_DESTINATION_TIMEOUT_MS = 2500;

function getSafeCallbackUrl(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/auth/")
    ? value
    : null;
}

function getSafeLoginErrorMessage(error: unknown) {
  if (error instanceof Error && typeof error.message === "string") {
    const message = error.message.trim();
    if (/failed to fetch|network\s*error|networkerror|load failed|connection/i.test(message)) {
      return "Unable to sign in. Please check your connection and try again.";
    }
    if (message && message !== "{}" && message !== "[object Object]") {
      return message;
    }
  }

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : null;

  return status && status >= 500
    ? "Authentication service unavailable. Please try again."
    : "Unable to sign in. Please try again.";
}

async function resolveLoginDestinationWithTimeout() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, LOGIN_DESTINATION_TIMEOUT_MS);

  try {
    const destinationResponse = await fetch("/api/auth/login-destination", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    const destinationPayload =
      (await destinationResponse.json()) as LoginDestinationResponse;

    if (!destinationResponse.ok || !destinationPayload.destination) {
      throw new Error(
        destinationPayload.error ??
          "Login succeeded, but your account destination could not be loaded. Please try again.",
      );
    }

    return destinationPayload.destination;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "password" | "google" | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = getSafeCallbackUrl(rawCallbackUrl);

  const formatRetryDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const requestedCallbackUrl = getSafeCallbackUrl(
      new URLSearchParams(window.location.search).get("callbackUrl"),
    );

    setError(null);
    setPendingAction("password");

    startTransition(async () => {
      const supabase = createClient();

      try {
        const rateLimit = await checkLoginRateLimitAction();
        if (!rateLimit.success) {
          throw new Error(rateLimit.error);
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const requestStatus = await getRegistrationRequestLoginStatusAction({
            email,
          });

          if (
            requestStatus.success &&
            requestStatus.data.status === "pending"
          ) {
            throw new Error(
              "Registration request submitted. Please wait for admin approval.",
            );
          }

          if (
            requestStatus.success &&
            requestStatus.data.status === "rejected"
          ) {
            const retryMessage = requestStatus.data.canRegisterAgainAt
              ? new Date(requestStatus.data.canRegisterAgainAt).getTime() <=
                Date.now()
                ? " You can submit a new registration request now."
                : ` You can submit a new registration request on ${formatRetryDate(
                    requestStatus.data.canRegisterAgainAt,
                  )}, unless an admin re-enables registration sooner.`
              : " Contact an admin for details.";

            throw new Error(
              requestStatus.data.rejectionReason
                ? `Registration request was rejected: ${requestStatus.data.rejectionReason}.${retryMessage}`
                : `Registration request was rejected.${retryMessage}`,
            );
          }

          if (
            requestStatus.success &&
            requestStatus.data.status === "approved"
          ) {
            throw new Error(
              "Your account has already been approved. Use the password given by your admin to log in. If you do not have it yet, contact your admin to set or reset your login password.",
            );
          }

          throw error;
        }

        try {
          const defaultDestination = await resolveLoginDestinationWithTimeout();
          window.location.replace(requestedCallbackUrl ?? defaultDestination);
        } catch (destinationError) {
          if (
            destinationError instanceof DOMException &&
            destinationError.name === "AbortError"
          ) {
            toast.info(
              "Login restored. Opening dashboard while POS status loads.",
            );
            window.location.replace(requestedCallbackUrl ?? "/dashboard");
            return;
          }

          throw destinationError;
        }
      } catch (err: unknown) {
        setError(getSafeLoginErrorMessage(err));
        setPendingAction(null);
      }
    });
  };

  const handleGoogleLogin = () => {
    if (isPending) return;

    setError(null);
    setPendingAction("google");

    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        setError(error.message);
        setPendingAction(null);
      }
    });
  };

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      data-login-callback-url={callbackUrl ?? ""}
      {...props}
    >
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
                <p
                  className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold shadow-lg shadow-primary/20"
                isPending={isPending && pendingAction === "password"}
                disabled={isPending}
                idleLabel="Login"
                pendingLabel="Signing you in..."
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 font-bold tracking-wider text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl font-bold"
                disabled={isPending}
                onClick={handleGoogleLogin}
              >
                {isPending && pendingAction === "google" ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Chrome className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {isPending && pendingAction === "google"
                  ? "Opening Google..."
                  : "Continue with Google"}
              </Button>
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
