import Link from "next/link";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { publicPages } from "@/lib/seo";

const primaryLinks = [
  { href: publicPages.features.path, label: "Features" },
  { href: publicPages.solutions.path, label: "Solutions" },
  { href: publicPages.pricing.path, label: "Pricing" },
  { href: publicPages.download.path, label: "Download" },
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
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(20,71,230,0.22),transparent_55%)]" />
      <div className="absolute top-0 -left-10 h-80 w-80 animate-blob rounded-full bg-accent/12 opacity-80 mix-blend-multiply blur-3xl" />
      <div className="absolute top-8 right-0 h-72 w-72 animate-blob rounded-full bg-cyan-400/12 opacity-70 mix-blend-multiply blur-3xl animation-delay-2000" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-emerald-500/10 opacity-70 mix-blend-multiply blur-3xl animation-delay-4000" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(7,26,61,0.05)_35%,transparent_70%)]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center">
        <header className="sticky top-0 z-20 flex w-full justify-center border-b border-white/10 bg-background/72 backdrop-blur-xl transition-all duration-300">
          <div className="flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-6 text-sm">
            <Link href="/" className="min-w-0">
              <BrandLogo
                compact
                showSubtitle
                subtitle="POS for daily business operations"
                markClassName="bg-white shadow-[0_18px_46px_rgba(20,71,230,0.22)]"
                subtitleClassName="hidden sm:block"
              />
            </Link>

            <div className="hidden items-center rounded-full border border-white/10 bg-white/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/90 lg:flex">
              Built for Philippine businesses
            </div>

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
              <ThemeSwitcher />
              <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="shadow-lg shadow-primary/20">
                <Link href="/auth/sign-up">Start Free</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="w-full flex-1">{children}</div>

        <footer className="w-full border-t border-white/10 bg-background/70 px-6 py-16 backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.25fr_1fr_auto] lg:items-start">
            <div className="space-y-5 text-center lg:text-left">
              <Link
                href="/"
                className="inline-flex items-center justify-center lg:justify-start"
              >
                <BrandLogo
                  showSubtitle
                  subtitle="Checkout, inventory, and reports"
                  subtitleClassName="text-[11px] tracking-[0.16em]"
                />
              </Link>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                POSard gives restaurants, retail stores, cafes, and service teams one focused
                system for checkout, inventory control, receipts, discounts, cashier access,
                and daily reporting.
              </p>
              <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                <Button asChild variant="outline">
                  <Link href={publicPages.pricing.path}>View Pricing</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Create POSard Account</Link>
                </Button>
                <PwaInstallButton label="Install PWA" />
              </div>
            </div>

            <nav className="flex flex-wrap justify-center gap-8 text-sm font-medium uppercase tracking-widest text-muted-foreground lg:justify-center">
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

            <div className="flex flex-col items-center gap-4 lg:items-end">
              <p className="rounded-full border border-white/10 bg-white/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Cebu, Philippines
              </p>
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
