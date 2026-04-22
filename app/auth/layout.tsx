import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { ThemeSwitcher } from "@/components/theme-switcher";
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
      <div className="absolute top-0 -left-4 h-72 w-72 animate-blob rounded-full bg-accent/10 opacity-70 mix-blend-multiply blur-3xl" />
      <div className="absolute top-0 -right-4 h-72 w-72 animate-blob rounded-full bg-emerald-500/10 opacity-70 mix-blend-multiply blur-3xl animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 h-72 w-72 animate-blob rounded-full bg-indigo-500/10 opacity-70 mix-blend-multiply blur-3xl animation-delay-4000" />

      <header className="glass-header w-full">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-2 transition-all">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-heading font-extrabold tracking-tight text-foreground">
              POS<span className="text-primary italic">ard</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href={publicPages.pricing.path}
              className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <ThemeSwitcher />
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-6 pb-20 pt-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>

      <footer className="absolute bottom-8 w-full text-center">
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
