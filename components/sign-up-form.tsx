"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { submitRegistrationRequestAction } from "@/app/auth/_actions/registration-request.action";
import { AuthFeedback, type AuthFeedbackState } from "@/components/auth-feedback";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
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

    if (!termsAccepted) {
      setFeedback({
        kind: "error",
        message: "Please accept the Terms and Conditions and Privacy Policy.",
      });
      return;
    }

    setFeedback({ kind: "pending", message: "Submitting your registration request..." });

    startTransition(async () => {
      try {
        const result = await submitRegistrationRequestAction({
          fullName,
          email,
          phone,
          companyName,
          requestedRole: "manager",
        });

        if (!result.success) {
          throw new Error(result.error);
        }

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
      <Card className="rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:bg-card/94">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Merchant onboarding
          </div>
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight md:text-4xl">
            Request Access
          </CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            Submit your merchant onboarding request for admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
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
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
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
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="phone"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+63 900 000 0000"
                  value={phone}
                  disabled={isPending}
                  aria-disabled={isPending}
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="company-name"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Company Name
                </Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder="Acme Stores"
                  value={companyName}
                  disabled={isPending}
                  aria-disabled={isPending}
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    clearFeedback();
                  }}
                />
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 shadow-sm">
                <Checkbox
                  id="terms-accepted"
                  checked={termsAccepted}
                  disabled={isPending}
                  aria-describedby="terms-accepted-description"
                  onCheckedChange={(checked) => {
                    setTermsAccepted(checked === true);
                    clearFeedback();
                  }}
                />
                <Label
                  htmlFor="terms-accepted"
                  id="terms-accepted-description"
                  className="text-left text-xs font-medium leading-5 text-muted-foreground"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="font-bold text-primary underline-offset-4 hover:underline"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-bold text-primary underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </div>

              <AuthFeedback state={feedback} />
              <AuthSubmitButton
                className="h-12 w-full rounded-xl font-bold shadow-lg shadow-primary/20"
                isPending={isPending}
                idleLabel="Submit Registration Request"
                pendingLabel="Submitting your request..."
              />
            </div>
            <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-bold text-primary hover:underline underline-offset-4"
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
