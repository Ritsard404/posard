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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-xl font-heading font-extrabold tracking-tight">
              POS<span className="text-primary italic">ard</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t bg-secondary/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-lg font-heading font-extrabold">
              POS<span className="text-primary italic">ard</span>
            </Link>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Mobile-first POS system for retail, restaurants, and growing
              businesses in the Philippines.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-muted-foreground">
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
        </div>
      </footer>
    </div>
  );
}
