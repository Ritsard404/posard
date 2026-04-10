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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

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
        throw new Error("User profile not found or unauthorized =>"+ (profileResult.error.message || ""));
      }

      if (profileResult.data.status !== "active") {
        await supabase.auth.signOut();
        throw new Error(
          "Account is pending approval or disabled. Contact an admin.",
        );
      }

      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="glass-card border-white/5">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">Login</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Enter your credentials to access your terminal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-xs font-bold text-accent hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-xs font-bold text-destructive text-center">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl font-bold glow-on-hover" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Login to Terminal"}
              </Button>
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
