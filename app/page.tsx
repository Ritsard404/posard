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
import { ShoppingCart, Package, BarChart3, ShieldCheck, Utensils, Truck } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { Button } from "@/components/ui/button";
import {
  absoluteUrl,
  faqJsonLd,
  jsonLdScript,
  organizationJsonLd,
  publicPages,
  siteConfig,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.title,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
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
    title: siteConfig.title,
    description: siteConfig.description,
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
    title: "Restaurant, retail, and service checkout",
    description:
      "Keep the counter moving with a cashier-friendly POS flow for product sales, cafe orders, restaurant counters, and service payments.",
    icon: ShoppingCart,
  },
  {
    title: "Inventory tracking",
    description:
      "Review inventory health, product stock, barcode details, stock movement, adjustments, and low-stock signals from one connected workspace.",
    icon: Package,
  },
  {
    title: "Reports and cash visibility",
    description:
      "Review sales, cashier activity, inventory health, debt collections, X-Reading, Z-Reading, and business performance from manager reports.",
    icon: BarChart3,
  },
  {
    title: "Role-based control",
    description:
      "Separate admin, manager, and cashier access with permissions, approvals, and searchable help that matches each user's role.",
    icon: ShieldCheck,
  },
  {
    title: "Kitchen and promotion tools",
    description:
      "Support restaurant counters with kitchen ticket tracking, promotion records, PWD, Senior Citizen, and custom discount workflows.",
    icon: Utensils,
  },
  {
    title: "Suppliers and branch movement",
    description:
      "Track suppliers, purchase orders, receiving records, expenses, and branch transfers alongside daily POS activity.",
    icon: Truck,
  },
];

const frequentlyAskedQuestions = [
  {
    question: "Is POSard a free POS system in the Philippines?",
    answer:
      "Yes. POSard is currently free for Philippine small businesses, with checkout, inventory, reports, permissions, and terminal management included.",
  },
  {
    question: "What businesses can use POSard?",
    answer:
      "POSard supports retail stores, restaurants, cafes, service businesses, startups, and growing branch operations.",
  },
  {
    question: "Can POSard work when the internet is unstable?",
    answer:
      "POSard includes offline-ready checkout support and sync review tools so daily counter work can recover from temporary connection problems.",
  },
  {
    question: "Does POSard include inventory and sales reports?",
    answer:
      "Yes. POSard connects product stock, inventory movements, suppliers, purchases, expenses, cashier activity, and sales reporting in one workspace.",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationJsonLd(),
    websiteJsonLd(),
    softwareJsonLd(),
    faqJsonLd(frequentlyAskedQuestions),
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
          <div className="w-full max-w-7xl flex min-h-16 justify-between items-center gap-2 px-4 py-2 text-sm sm:px-6 sm:py-0">
            <BrandLogo compact showSubtitle subtitle="POS for daily business operations" subtitleClassName="hidden lg:block" />
            
            <div className="hidden md:flex gap-8 items-center font-medium text-muted-foreground">
              <Link href={publicPages.features.path} className="hover:text-accent transition-colors">Features</Link>
              <Link href={publicPages.solutions.path} className="hover:text-accent transition-colors">Solutions</Link>
              <Link href={publicPages.pricing.path} className="hover:text-accent transition-colors">Pricing</Link>
              <Link href={publicPages.download.path} className="hover:text-accent transition-colors">Download</Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
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
        <section className="relative w-full max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:pb-32">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6 text-center sm:space-y-8 lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Built for Philippine Small Businesses
              </div>
              
              <h1 className="text-[2.75rem] font-heading font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                POSard POS system for <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-emerald-500">any daily checkout.</span>
              </h1>
              
              <p className="mx-auto max-w-xl text-base leading-7 text-muted-foreground sm:text-lg md:text-xl lg:mx-0 lg:leading-relaxed">
                POSard helps Philippine restaurants, cafes, retail stores, and service businesses run checkout, offline sync, receipts, inventory, suppliers, expenses, promotions, kitchen workflow, permissions, and reports from one mobile-first POS platform.
              </p>
              
              <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap sm:gap-4 lg:justify-start">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="h-14 w-full px-6 text-base font-bold glow-on-hover rounded-xl shadow-lg shadow-accent/20 sm:w-auto sm:px-8 sm:text-lg">
                    Start with POSard
                  </Button>
                </Link>
                <Link href={publicPages.features.path}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full px-6 text-base font-bold rounded-xl border-2 hover:bg-secondary transition-all sm:w-auto sm:px-8 sm:text-lg"
                  >
                    View Features
                  </Button>
                </Link>
                <Link href={publicPages.download.path}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full px-6 text-base font-bold rounded-xl border-2 hover:bg-secondary transition-all sm:w-auto sm:px-8 sm:text-lg"
                  >
                    Download App
                  </Button>
                </Link>
                <PwaInstallButton
                  size="lg"
                  label="Install App"
                  className="h-14 w-full sm:max-w-[12rem]"
                />
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
                  alt="POSard point of sale dashboard for Philippine small businesses"
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
        <section id="features" className="w-full max-w-7xl border-t border-white/5 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 space-y-4 text-center sm:mb-20">
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl md:text-5xl">
              Built for <span className="text-accent">daily store operations.</span>
            </h2>
            <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
              Everything POSard needs to do well at the counter and after closing: sales, orders, stock tracking, purchase records, transfers, expenses, customers, promotions, kitchen tickets, cashier control, and X-Reading or Z-Reading reports.
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

        <section className="w-full max-w-7xl border-t border-white/5 px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-heading font-bold tracking-tight md:text-5xl">
                Philippine POS system questions
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                Quick answers for owners comparing POS software for retail, restaurants,
                cafes, and service businesses.
              </p>
            </div>
            <div className="mt-10 grid gap-4">
              {frequentlyAskedQuestions.map((item) => (
                <details
                  key={item.question}
                  className="glass-card rounded-2xl border border-white/10 bg-white/55 p-5"
                >
                  <summary className="cursor-pointer font-heading text-lg font-bold">
                    {item.question}
                  </summary>
                  <p className="mt-3 leading-7 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-white/5 bg-secondary/10 py-16 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex justify-center md:justify-start">
                <BrandLogo showSubtitle subtitle="Checkout, inventory, and reports" subtitleClassName="text-[11px] tracking-[0.16em]" />
              </div>
              <p className="max-w-xs text-muted-foreground text-sm uppercase tracking-widest font-bold">
                POS checkout, inventory, purchasing, expenses, transfers, kitchen workflow, and reports for restaurants, retail, cafes, and service teams.
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
                (c) 2026 POSard. Built by Ritsard.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
