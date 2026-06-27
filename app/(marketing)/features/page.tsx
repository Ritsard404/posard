import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  featureCatalog,
  featureCatalogCategories,
  getFeaturesByCategory,
} from "@/lib/feature-catalog";
import {
  createPublicPageMetadata,
  softwareJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("features");

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [softwareJsonLd(), webPageJsonLd("features")],
};

function FeatureCard({
  feature,
}: {
  feature: (typeof featureCatalog)[number];
}) {
  return (
    <article
      id={feature.id}
      className="glass-card flex h-full flex-col rounded-lg border border-white/10 bg-white/55 p-5 shadow-[0_20px_60px_rgba(7,26,61,0.08)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {feature.roles.map((role) => (
          <Badge key={role} variant="secondary" className="rounded-full">
            {role}
          </Badge>
        ))}
      </div>
      <h3 className="mt-4 font-heading text-xl font-bold tracking-tight">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {feature.summary}
      </p>
      <div className="mt-4 rounded-lg border border-emerald-500/15 bg-emerald-500/8 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          Benefit
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground">
          {feature.benefit}
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        <span className="font-semibold text-foreground">Sample: </span>
        {feature.sampleOutcome}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button asChild size="sm">
          <Link href={`/feature-guide#${feature.id}`}>
            Open signed-in guide
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/help#${feature.helpAnchor}`}>Help topic</Link>
        </Button>
      </div>
    </article>
  );
}

export default function FeaturesPage() {
  return (
    <PageShell
      eyebrow="POSard features"
      title="POSard feature catalog for checkout, inventory, operations, and reports"
      description="Read what each POSard feature does, the business benefit it supports, and the signed-in guide that shows how the workflow works inside the app."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Feature catalog"
        description={`${featureCatalog.length} POSard features grouped by daily store workflow. Prospects can read the benefit examples here, while signed-in users can open the protected walkthrough for each feature.`}
      >
        <div className="grid gap-3 rounded-lg border border-white/10 bg-white/40 p-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCatalogCategories.map((category) => (
            <a
              key={category}
              href={`#${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="rounded-lg border border-white/10 bg-background/70 px-4 py-3 text-sm font-semibold transition-colors hover:bg-background"
            >
              {category}
            </a>
          ))}
        </div>
      </ContentSection>

      {featureCatalogCategories.map((category) => (
        <ContentSection
          key={category}
          title={category}
          description="Open a feature card to see its protected walkthrough, practical steps, and a sample business outcome."
        >
          <div
            id={category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {getFeaturesByCategory(category).map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </ContentSection>
      ))}
    </PageShell>
  );
}
