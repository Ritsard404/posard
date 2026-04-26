import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { publicPages } from "@/lib/seo";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(216_45%_96%)_100%)] font-sans dark:bg-[linear-gradient(180deg,hsl(222_47%_6%)_0%,hsl(221_38%_8%)_100%)]">
      <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(36,99,235,0.18),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_58%)]" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/8 blur-3xl dark:bg-blue-400/10" />
      <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl dark:bg-sky-300/8" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-slate-400/8 blur-3xl dark:bg-slate-300/5" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.5)_50%,transparent_100%)] opacity-40 dark:hidden" />

      <header className="relative z-10 flex w-full justify-center border-b border-border/60 bg-background/72 backdrop-blur-xl">
        <div className="flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-6">
          <Link href="/" className="min-w-0">
            <BrandLogo
              compact
              showSubtitle
              subtitle="Retail checkout suite"
              subtitleClassName="hidden sm:block"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="hidden rounded-xl border-border/70 bg-background/70 text-foreground shadow-sm sm:inline-flex">
              <Link href={publicPages.pricing.path}>Pricing</Link>
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 md:py-14">
        {children}
      </main>

      <footer className="relative z-10 px-6 pb-8 text-center">
        <p className="text-xs font-medium text-muted-foreground">
          (c) 2026 POSard.{" "}
          <Link
            href={publicPages.terms.path}
            className="font-semibold underline-offset-4 hover:underline"
          >
            Terms
          </Link>{" "}
          |{" "}
          <Link
            href={publicPages.privacy.path}
            className="font-semibold underline-offset-4 hover:underline"
          >
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
