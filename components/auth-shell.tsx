import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, Receipt, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { publicPages } from "@/lib/seo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const featureCards: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Faster cashier flow",
    description: "Built for quick retail checkout without cluttered steps.",
    icon: Receipt,
  },
  {
    title: "Clear daily visibility",
    description: "Track inventory, receipts, and reports in one connected workspace.",
    icon: BarChart3,
  },
  {
    title: "Role-based access",
    description: "Keep cashier, manager, and owner actions under the right controls.",
    icon: ShieldCheck,
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="w-full max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-stretch">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(20,71,230,0.18),rgba(7,26,61,0.92))] p-6 text-white shadow-[0_24px_90px_rgba(7,26,61,0.24)] md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%)]" />
          <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <BrandLogo
              showSubtitle
              subtitle="Retail checkout suite"
              className="text-white"
              markClassName="border-white/15 bg-white/95"
              titleClassName="text-white"
              subtitleClassName="text-white/70"
            />

            <div className="mt-8 inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/85">
              {eyebrow}
            </div>

            <h1 className="mt-5 max-w-xl font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/76 md:text-base">
              {description}
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-1">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm"
                  >
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white/12 text-white">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="mt-4 text-base font-bold">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                variant="secondary"
                className="rounded-xl bg-white text-slate-900 hover:bg-white/90"
              >
                <Link href={publicPages.features.path}>
                  View features
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={publicPages.pricing.path}>See pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="flex min-w-0 items-center">{children}</div>
      </div>
    </div>
  );
}
