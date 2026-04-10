"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="glass-card border-white/5 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight text-emerald-500">Welcome Aboard!</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Registration successful</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your merchant profile is now ready. Our administration team will review
              and activate your terminal access shortly.
            </p>
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
            <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">Reset Password</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              We&apos;ll send a secure link to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    className="h-12 rounded-xl bg-background/50 border-white/10"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-xs font-bold text-destructive text-center">{error}</p>}
                <Button type="submit" className="h-12 w-full rounded-xl font-bold glow-on-hover" disabled={isLoading}>
                  {isLoading ? "Sending Link..." : "Send Reset Link"}
                </Button>
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
