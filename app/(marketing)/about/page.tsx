import type { Metadata } from "next";

import {
  BulletGrid,
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import {
  createPublicPageMetadata,
  organizationJsonLd,
  softwareJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("about");

const principles = [
  {
    title: "Built for Philippine operations",
    description:
      "POSard supports day-to-day sales, inventory, suppliers, purchasing, expenses, receipts, permissions, and reporting workflows used by small businesses in Cebu and across the Philippines.",
  },
  {
    title: "Mobile-first by design",
    description:
      "The interface is designed for fast checkout and low-training use on modern devices, so teams can work quickly during busy hours.",
  },
  {
    title: "Scales by terminal",
    description:
      "Businesses can start with a default terminal and add more terminals as locations, counters, or teams grow.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationJsonLd(),
    websiteJsonLd(),
    softwareJsonLd(),
    webPageJsonLd("about"),
  ],
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About POSard"
      title="A mobile-first POS system for modern Philippine businesses"
      description="POSard is a cloud POS platform for small to medium businesses that need fast checkout, clear inventory and purchasing records, expense visibility, reliable reports, and secure staff access without operational complexity."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Focused on practical business work"
        description="POSard brings checkout, product management, stock movement, supplier records, purchase orders, branch transfers, expenses, customer activity, terminal setup, receipt handling, kitchen workflow, and sales reporting into one streamlined system. It is built for retail shops, restaurants, cafes, service providers, and startups that need a small business POS system that is easy to operate."
      >
        <BulletGrid items={principles} />
      </ContentSection>

      <ContentSection title="Why POSard exists">
        <div className="max-w-4xl space-y-5 text-base leading-7 text-muted-foreground">
          <p>
            Many small businesses still manage sales, inventory, discounts, and
            receipts through separate manual processes. POSard reduces that
            work by giving owners and managers a single place to track daily
            sales, cash activity, product movement, purchasing, transfers,
            expenses, customers, promotions, staff access, and terminal
            performance.
          </p>
          <p>
            The goal is an affordable and scalable POS system Philippines
            businesses can use with minimal training, whether they run one
            counter or several terminals across a growing operation.
          </p>
        </div>
      </ContentSection>
    </PageShell>
  );
}
