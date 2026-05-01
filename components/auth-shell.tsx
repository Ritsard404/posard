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
    description:
      "Track inventory, receipts, and reports in one connected workspace.",
    icon: BarChart3,
  },
  {
    title: "Role-based access",
    description:
      "Keep cashier, manager, and owner actions under the right controls.",
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
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(245,248,255,0.98)_0%,rgba(229,236,248,0.96)_32%,rgba(203,214,232,0.94)_100%)] p-6 text-slate-900 shadow-[0_20px_70px_rgba(15,23,42,0.10)] md:p-8 lg:p-10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(29,41,68,0.98)_0%,rgba(23,34,59,0.96)_40%,rgba(16,24,43,0.98)_100%)] dark:text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.30),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_34%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(148,163,184,0.14))] dark:bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.24))]" />

          <div className="relative flex h-full flex-col">
            <BrandLogo
              showSubtitle
              subtitle="Retail checkout suite"
              className="text-slate-900 dark:text-white"
              markClassName="border-white/30 bg-white shadow-sm dark:border-white/15 dark:bg-white/95"
              titleClassName="text-slate-900 dark:text-white"
              subtitleClassName="text-slate-600 dark:text-white/72"
            />

            <div className="mt-8 inline-flex w-fit items-center rounded-full border border-primary/12 bg-white/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary shadow-sm dark:border-white/16 dark:bg-white/8 dark:text-white/88">
              {eyebrow}
            </div>

            <h1 className="mt-5 max-w-xl font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700 md:text-base dark:text-white/76">
              {description}
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-1">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="rounded-[1.5rem] border border-slate-200/70 bg-white/68 p-4 backdrop-blur-sm dark:border-white/12 dark:bg-white/6"
                  >
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary shadow-inner dark:bg-white/12 dark:text-white">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                      {feature.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/70">
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
                className="rounded-xl bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/92"
              >
                <Link href={publicPages.features.path}>
                  View features
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-slate-300/80 bg-white/55 text-slate-700 hover:bg-white/80 hover:text-slate-900 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
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
