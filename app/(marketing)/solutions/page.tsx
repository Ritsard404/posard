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
      "Use POSard as a retail POS for checkout, product catalogs, stock tracking, barcode details, supplier records, purchase orders, branch transfers, receipt history, and daily reports.",
  },
  {
    title: "Restaurants and cafes",
    description:
      "Run a restaurant POS workflow for quick orders, cashier shifts, discounts, kitchen tickets, receipts, customer display, and X or Z readings at closing.",
  },
  {
    title: "Small businesses and startups",
    description:
      "Start with one default terminal and up to 2 cashier accounts, then add terminals as the business grows without changing systems.",
  },
  {
    title: "Service-based businesses",
    description:
      "Track service sales, customer transactions, unpaid balances, payment references, expenses, and business reports from one cloud POS workspace.",
  },
  {
    title: "Growing branch operations",
    description:
      "Monitor transfers, inventory health, suppliers, purchasing, expenses, permissions, and approvals as the business adds more counters or locations.",
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
      "Give owners and managers clearer sales, stock, purchasing, expense, customer, kitchen, and terminal data for faster decisions.",
  },
  {
    title: "Stronger team control",
    description:
      "Use role-based access, per-terminal cashier capacity, and manager approval workflows to protect important POS operations.",
  },
  {
    title: "Easier staff guidance",
    description:
      "Use searchable in-app help so admins, managers, and cashiers can find guides that match their access.",
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
      description="POSard is built for Philippine small businesses that need a mobile POS platform for daily sales, inventory, purchasing, expenses, reports, staff access, and growing terminal needs."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Designed for common business types"
        description="Each business model needs speed, accuracy, and visibility. POSard keeps the core checkout workflow simple while supporting operational controls owners expect from a cloud POS system."
      >
        <BulletGrid items={solutions} />
      </ContentSection>

      <ContentSection title="Operational value">
        <BulletGrid items={benefits} />
      </ContentSection>
    </PageShell>
  );
}
