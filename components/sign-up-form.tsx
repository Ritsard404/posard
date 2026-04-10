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

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] = useState(""); // 👈 new
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName }, // trigger reads this
        },
      });
      if (error) throw error;

      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : JSON.stringify(error);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="glass-card border-white/5">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading font-extrabold tracking-tight">Sign up</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Create your merchant account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Juan dela Cruz"
                  required
                  value={fullName}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Repeat Password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  className="h-12 rounded-xl bg-background/50 border-white/10"
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-xs font-bold text-destructive text-center">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl font-bold glow-on-hover" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create My Merchant Account"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-accent font-bold hover:underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
