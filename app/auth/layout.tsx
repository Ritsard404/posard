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
    <div className="relative min-h-screen overflow-hidden bg-background font-sans">
      <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(20,71,230,0.18),transparent_58%)]" />
      <div className="absolute top-0 -left-10 h-80 w-80 animate-blob rounded-full bg-accent/12 opacity-80 mix-blend-multiply blur-3xl" />
      <div className="absolute top-8 right-0 h-72 w-72 animate-blob rounded-full bg-cyan-400/12 opacity-70 mix-blend-multiply blur-3xl animation-delay-2000" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-emerald-500/10 opacity-70 mix-blend-multiply blur-3xl animation-delay-4000" />

      <header className="relative z-10 flex w-full justify-center border-b border-white/10 bg-background/70 backdrop-blur-xl">
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
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
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
