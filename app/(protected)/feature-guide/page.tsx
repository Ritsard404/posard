import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ListChecks,
} from "lucide-react";

import { HeaderActions } from "@/components/layout/HeaderActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  featureCatalog,
  featureCatalogCategories,
  getFeaturesByCategory,
  type FeatureCatalogItem,
} from "@/lib/feature-catalog";
import { getCurrentProfile } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Feature Guide",
  description:
    "Signed-in POSard feature guide with workflow steps, sample benefits, Help Center links, and app entry points.",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveAppPath(feature: FeatureCatalogItem, companyId?: string | null) {
  if (!feature.appPath) return null;

  if (feature.appPath.includes("[companyId]")) {
    return companyId
      ? feature.appPath.replace("[companyId]", companyId)
      : null;
  }

  return feature.appPath;
}

function CategoryIndex() {
  return (
    <Card className="border-border/80 p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {featureCatalogCategories.map((category) => (
          <Button key={category} asChild size="sm" variant="outline">
            <a href={`#${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              {category}
            </a>
          </Button>
        ))}
      </div>
    </Card>
  );
}

function FeatureGuideCard({
  feature,
  appHref,
}: {
  feature: FeatureCatalogItem;
  appHref: string | null;
}) {
  return (
    <article
      id={feature.id}
      className="scroll-mt-24 rounded-lg border border-border/80 bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{feature.category}</Badge>
            {feature.roles.map((role) => (
              <Badge key={role} variant="outline">
                {role}
              </Badge>
            ))}
          </div>
          <h3 className="mt-3 text-xl font-bold tracking-tight">
            {feature.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {feature.summary}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {appHref ? (
            <Button asChild size="sm">
              <Link href={appHref}>
                Open app area
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href={`/help#${feature.helpAnchor}`}>
              Help guide
              <BookOpen className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
        <div className="rounded-lg border bg-muted/25 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-primary" />
            How it works
          </div>
          <ol className="mt-3 grid gap-2 text-sm leading-6">
            {feature.howItWorks.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              Benefit
            </div>
            <p className="mt-2 text-sm leading-6">{feature.benefit}</p>
          </div>
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-amber-950">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
              Sample outcome
            </p>
            <p className="mt-2 text-sm leading-6">{feature.sampleOutcome}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function FeatureGuidePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-4">
      <HeaderActions>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/features">Public features</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="shrink-0">
          <Link href="/help">Help Center</Link>
        </Button>
      </HeaderActions>

      <Card className="border-border/80 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BookOpen className="size-4" />
              Signed-in feature walkthroughs
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
              See how POSard features work in daily operations
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              Each feature includes a practical workflow, sample benefit, and a
              shortcut to the matching POSard page or Help Center guide.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Feature cards
            </p>
            <p className="mt-1 text-2xl font-bold">{featureCatalog.length}</p>
          </div>
        </div>
      </Card>

      <CategoryIndex />

      {featureCatalogCategories.map((category) => (
        <section
          key={category}
          id={category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
          className="scroll-mt-24 space-y-3"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Feature group
            </p>
            <h2 className="text-xl font-bold tracking-tight">{category}</h2>
          </div>
          <div className="grid gap-3">
            {getFeaturesByCategory(category).map((feature) => (
              <FeatureGuideCard
                key={feature.id}
                feature={feature}
                appHref={resolveAppPath(feature, profile?.companyId)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
