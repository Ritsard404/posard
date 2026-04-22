import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { publicPages } from "@/lib/seo";

const primaryLinks = [
  { href: publicPages.features.path, label: "Features" },
  { href: publicPages.solutions.path, label: "Solutions" },
  { href: publicPages.pricing.path, label: "Pricing" },
  { href: publicPages.about.path, label: "About" },
];

const footerLinks = [
  ...primaryLinks,
  { href: publicPages.contact.path, label: "Contact" },
  { href: publicPages.privacy.path, label: "Privacy" },
  { href: publicPages.terms.path, label: "Terms" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="absolute top-0 -left-4 h-72 w-72 animate-blob rounded-full bg-accent/10 opacity-70 mix-blend-multiply blur-3xl" />
      <div className="absolute top-0 -right-4 h-72 w-72 animate-blob rounded-full bg-emerald-500/10 opacity-70 mix-blend-multiply blur-3xl animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 h-72 w-72 animate-blob rounded-full bg-indigo-500/10 opacity-70 mix-blend-multiply blur-3xl animation-delay-4000" />

      <div className="relative z-10 flex min-h-screen flex-col items-center">
        <header className="glass-header flex h-16 w-full justify-center transition-all duration-300">
          <div className="flex w-full max-w-7xl items-center justify-between px-6 text-sm">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <ShieldCheck className="h-5 w-5 text-accent-foreground" />
              </span>
              <span className="text-xl font-heading font-extrabold tracking-tight text-foreground">
                <span className="text-accent">POS</span>ard
              </span>
            </Link>

            <nav className="hidden items-center gap-8 font-medium text-muted-foreground md:flex">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3 md:gap-4">
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/sign-up">Sign up</Link>
              </Button>
            </div>
          </div>
        </header>

        {children}

        <footer className="w-full border-t border-white/5 bg-secondary/10 px-6 py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 md:flex-row">
            <div className="space-y-4 text-center md:text-left">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 md:justify-start"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <ShieldCheck className="h-5 w-5 text-accent-foreground" />
                </span>
                <span className="text-2xl font-heading font-extrabold tracking-tight">
                  POSard<span className="text-accent">POS</span>
                </span>
              </Link>
              <p className="max-w-xs text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Mobile-first POS system for Philippine businesses.
              </p>
            </div>

            <nav className="flex flex-wrap justify-center gap-8 text-sm font-medium uppercase tracking-widest text-muted-foreground md:gap-12">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col items-center gap-4 md:items-end">
              <ThemeSwitcher />
              <p className="text-xs text-muted-foreground">
                (c) 2026 POSard. Built by Ritsard.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
