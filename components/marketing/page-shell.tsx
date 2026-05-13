import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { Button } from "@/components/ui/button";
import { publicPages } from "@/lib/seo";
type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

type ContentSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

type BulletGridProps = {
  items: Array<{
    title: string;
    description: string;
  }>;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <main className="w-full">
      <section className="relative w-full border-b border-white/5">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 md:py-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {eyebrow}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-heading font-extrabold leading-tight tracking-tight md:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="shadow-lg shadow-primary/20">
                <Link href="/auth/sign-up">
                  Start with POSard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={publicPages.pricing.path}>View pricing</Link>
              </Button>
              <PwaInstallButton label="Install PWA" />
            </div>
          </div>

          <aside className="glass-card rounded-[1.75rem] border border-white/10 bg-white/55 p-6 shadow-[0_24px_80px_rgba(7,26,61,0.12)] backdrop-blur-sm">
            <BrandLogo
              compact
              showSubtitle
              subtitle="Mobile-first business POS"
              subtitleClassName="text-[10px] tracking-[0.18em]"
            />
            <div className="mt-6 space-y-3">
              {[
                "Fast checkout and offline sync",
                "Inventory, suppliers, and expenses",
                "Reports, permissions, and help guides",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-sm font-medium text-foreground shadow-sm"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16">
        {children}
      </div>
    </main>
  );
}

export function ContentSection({
  title,
  description,
  children,
}: ContentSectionProps) {
  return (
    <section className="border-t border-white/5 py-10 first:border-t-0 md:py-12">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-heading font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function BulletGrid({ items }: BulletGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.title}
          className="glass-card rounded-[1.5rem] border border-white/10 bg-white/55 p-5 shadow-[0_20px_60px_rgba(7,26,61,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(20,71,230,0.16)]"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
