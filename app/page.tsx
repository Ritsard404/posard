import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart, Package, BarChart3, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Point of Sale",
    description:
      "Fast and intuitive checkout experience with real-time inventory updates",
    icon: ShoppingCart,
  },
  {
    title: "Inventory Management",
    description:
      "Track stock levels, manage suppliers, and automate reordering",
    icon: Package,
  },
  {
    title: "Detailed Reports",
    description:
      "Comprehensive analytics and insights into your business performance",
    icon: BarChart3,
  },
];

export default async function Home() {
  // Check if user is logged in
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // If logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {/* Hero Section */}
          <section className="container px-4 py-12 md:py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Modern POS & Inventory Management
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl md:mt-6">
                Streamline your business operations with our comprehensive
                point-of-sale and inventory management system.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                  </Button>
                </Link>
                <Link href="/signin">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="container px-4 py-12 md:py-16 lg:py-20">
            <div className="mx-auto max-w-screen-xl">
              <h2 className="mb-8 text-center text-3xl font-bold tracking-tighter sm:text-4xl md:mb-12">
                Features
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.title}>
                      <CardHeader>
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <div className="container max-w-screen-2xl px-4">
            <p className="text-center text-sm text-muted-foreground">
              © 2026 Baisard. All rights reserved.
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Built by Ritsard
            </p>
          </div>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
