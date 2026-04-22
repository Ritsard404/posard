import Link from "next/link";
import type { Metadata } from "next";

import {
  BulletGrid,
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";
import {
  createPublicPageMetadata,
  publicPages,
  siteConfig,
  softwareJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("pricing");

const pricingDetails = [
  {
    title: "Per-terminal subscription",
    description:
      "Each active POS terminal has its own monthly subscription, so pricing follows actual business usage.",
  },
  {
    title: "Default terminal included",
    description:
      "The first registered user automatically receives a default terminal during onboarding.",
  },
  {
    title: "Scalable as you grow",
    description:
      "Add more terminals when you add counters, devices, branches, or operating teams.",
  },
  {
    title: "No hidden platform fees",
    description:
      "POSard keeps pricing simple for small businesses comparing POS system price Philippines options.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [softwareJsonLd(), webPageJsonLd("pricing")],
};

export default function PricingPage() {
  return (
    <PageShell
      eyebrow="POSard pricing"
      title="Affordable POS pricing for Philippine small businesses"
      description="POSard uses a simple per-terminal subscription model for businesses that need a low-cost POS system with checkout, inventory, reports, and terminal management."
    >
      <JsonLdScript data={jsonLd} />
      <section className="rounded-md border bg-background p-6 shadow-sm md:p-8">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">
          Monthly plan
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-5xl font-heading font-extrabold">
              PHP {siteConfig.price.amount}
            </p>
            <p className="mt-2 text-muted-foreground">
              ₱{siteConfig.price.amount} per terminal / month
            </p>
          </div>
          <Button asChild size="lg" className="min-h-12">
            <Link href="/auth/sign-up">Create merchant account</Link>
          </Button>
        </div>
      </section>

      <ContentSection
        title="What the plan includes"
        description="The plan gives each terminal access to the POSard workflow for checkout, inventory and sales tracking, reports, receipts, roles, and terminal configuration."
      >
        <BulletGrid items={pricingDetails} />
      </ContentSection>

      <ContentSection title="Need support before subscribing?">
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Contact POSard through the{" "}
          <Link
            href={publicPages.contact.path}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            contact page
          </Link>{" "}
          for inquiries about terminals, business setup, or partnership
          opportunities.
        </p>
      </ContentSection>
    </PageShell>
  );
}
