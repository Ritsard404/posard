import type { Metadata } from "next";

import {
  BulletGrid,
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import {
  createPublicPageMetadata,
  softwareJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("solutions");

const solutions = [
  {
    title: "Retail stores",
    description:
      "Use POSard as a retail POS for checkout, product catalogs, stock tracking, barcode details, receipt history, and daily sales reports.",
  },
  {
    title: "Restaurants and cafes",
    description:
      "Run a restaurant POS workflow for quick orders, cashier shifts, discounts, receipts, and X or Z readings at closing.",
  },
  {
    title: "Small businesses and startups",
    description:
      "Start with one default terminal and up to 2 cashier accounts, then add terminals as the business grows without changing systems.",
  },
  {
    title: "Service-based businesses",
    description:
      "Track service sales, customer transactions, payment references, and business reports from one cloud POS workspace.",
  },
];

const benefits = [
  {
    title: "Less manual work",
    description:
      "Centralize sales, inventory, receipts, and reports instead of maintaining separate spreadsheets or paper logs.",
  },
  {
    title: "Better daily visibility",
    description:
      "Give owners and managers clearer sales and terminal data for faster decisions.",
  },
  {
    title: "Stronger team control",
    description:
      "Use role-based access, per-terminal cashier capacity, and manager approval workflows to protect important POS operations.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [softwareJsonLd(), webPageJsonLd("solutions")],
};

export default function SolutionsPage() {
  return (
    <PageShell
      eyebrow="POS solutions"
      title="POS solutions for retail, restaurants, cafes, and service businesses"
      description="POSard is built for Philippine small businesses that need a mobile POS platform for daily sales, inventory, reports, and growing terminal needs."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Designed for common business types"
        description="Each business model needs speed, accuracy, and visibility. POSard keeps the core workflow simple while supporting the controls owners expect from a cloud POS system."
      >
        <BulletGrid items={solutions} />
      </ContentSection>

      <ContentSection title="Operational value">
        <BulletGrid items={benefits} />
      </ContentSection>
    </PageShell>
  );
}
