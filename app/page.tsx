import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart, Package, BarChart3, ShieldCheck, Zap, Globe } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  jsonLdScript,
  organizationJsonLd,
  publicPages,
  siteConfig,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "POSard POS System for Retail Checkout and Inventory",
  description:
    "POSard is a retail POS system for Philippine stores, cafes, and small businesses with checkout, inventory, receipts, discounts, and sales reports.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "POSard POS System for Retail Checkout and Inventory",
    description:
      "POSard helps Philippine stores, cafes, and service businesses manage checkout, inventory, receipts, discounts, and daily sales reports.",
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "POSard small business POS software",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "POSard POS System for Retail Checkout and Inventory",
    description:
      "POSard helps Philippine stores, cafes, and service businesses manage checkout, inventory, receipts, discounts, and daily sales reports.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const features = [
  {
    title: "Retail checkout",
    description:
      "Keep the counter moving with a cashier-friendly POS flow built for touch screens, quick sales, and accurate totals.",
    icon: ShoppingCart,
  },
  {
    title: "Inventory tracking",
    description:
      "Track products, stock levels, barcodes, and availability from one connected retail workspace.",
    icon: Package,
  },
  {
    title: "Sales reports",
    description:
      "Review daily sales, cashier activity, and product performance with reports built for operational decisions.",
    icon: BarChart3,
  },
  {
    title: "Role-based control",
    description:
      "Separate owner, manager, and cashier access so sensitive POS actions stay under the right level of control.",
    icon: ShieldCheck,
  },
  {
    title: "Discount-ready workflow",
    description:
      "Handle PWD, Senior Citizen, and custom discount flows without breaking the speed of checkout.",
    icon: Zap,
  },
  {
    title: "Multi-terminal setup",
    description:
      "Run one store or multiple terminals with shared records for receipts, reports, subscriptions, and team activity.",
    icon: Globe,
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationJsonLd(),
    websiteJsonLd(),
    softwareJsonLd(),
  ],
};

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      {/* Decorative Background Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Navigation */}
        <nav className="w-full flex justify-center glass-header h-16 transition-all duration-300">
          <div className="w-full max-w-7xl flex justify-between items-center px-6 text-sm">
            <BrandLogo compact showSubtitle subtitle="Retail checkout suite" subtitleClassName="hidden lg:block" />
            
            <div className="hidden md:flex gap-8 items-center font-medium text-muted-foreground">
              <Link href={publicPages.features.path} className="hover:text-accent transition-colors">Features</Link>
              <Link href={publicPages.solutions.path} className="hover:text-accent transition-colors">Solutions</Link>
              <Link href={publicPages.pricing.path} className="hover:text-accent transition-colors">Pricing</Link>
            </div>

            <div className="flex items-center gap-4">
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/sign-up">Sign up</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative w-full max-w-7xl pt-20 pb-16 px-6 lg:pt-32 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Built for Philippine Small Businesses
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold tracking-tighter leading-[1.1] text-foreground">
                POSard POS system for <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-emerald-500">retail checkout.</span>
              </h1>
              
              <p className="max-w-xl mx-auto lg:mx-0 text-lg md:text-xl text-muted-foreground leading-relaxed">
                POSard helps Philippine retail stores, cafes, and service businesses run checkout, inventory, receipts, discounts, cashier roles, and sales reports from one mobile-first POS platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="h-14 px-8 text-lg font-bold glow-on-hover rounded-xl shadow-lg shadow-accent/20">
                    Start with POSard
                  </Button>
                </Link>
                <Link href={publicPages.features.path}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-lg font-bold rounded-xl border-2 hover:bg-secondary transition-all"
                  >
                    View Features
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-8 text-sm text-muted-foreground font-medium">
                <div className="flex -space-x-2">
                  {["R", "S", "M", "C"].map((initial) => (
                    <div
                      key={initial}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-bold text-foreground"
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <span>Built for growing Philippine business teams</span>
              </div>
            </div>

            <div className="relative group perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-emerald-500/20 rounded-[2.5rem] blur-3xl group-hover:blur-[100px] transition-all duration-700 opacity-50"></div>
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 glass-card p-4 translate-y-0 group-hover:-translate-y-4 transition-transform duration-700">
                <Image
                  src="/images/pos-hero.png"
                  alt="POSard Interface"
                  width={800}
                  height={600}
                  className="rounded-[1.5rem] shadow-2xl"
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full max-w-7xl py-24 px-6 border-t border-white/5">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">
              Built for <span className="text-accent">daily store operations.</span>
            </h2>
            <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
              Everything POSard needs to do well at the counter: checkout, stock tracking, receipts, discounts, cashier control, and X-Reading or Z-Reading reports.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title} 
                  className={`glass-card hover:-translate-y-2 group border-white/5 bg-secondary/30 transition-all duration-500 delay-${idx * 100}`}
                >
                  <CardHeader>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                      <Icon className="h-7 w-7 text-accent group-hover:text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-white/5 bg-secondary/10 py-16 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex justify-center md:justify-start">
                <BrandLogo showSubtitle subtitle="Retail checkout, inventory, and reports" subtitleClassName="text-[11px] tracking-[0.16em]" />
              </div>
              <p className="max-w-xs text-muted-foreground text-sm uppercase tracking-widest font-bold">
                Retail checkout, inventory, and reports in one system.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-12 text-sm font-medium text-muted-foreground uppercase tracking-widest">
              <Link href={publicPages.about.path} className="hover:text-foreground transition-colors">About</Link>
              <Link href={publicPages.privacy.path} className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href={publicPages.terms.path} className="hover:text-foreground transition-colors">Terms</Link>
              <Link href={publicPages.contact.path} className="hover:text-foreground transition-colors">Contact</Link>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4">
              <ThemeSwitcher />
              <p className="text-xs text-muted-foreground">
                © 2026 POSard. Built with ❤️ by Ritsard.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
