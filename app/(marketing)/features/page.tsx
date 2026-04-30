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

export const metadata: Metadata = createPublicPageMetadata("features");

const checkoutFeatures = [
  {
    title: "Fast POS checkout",
    description:
      "Run terminal-ready sales with a clear cashier workflow built for speed and accuracy.",
  },
  {
    title: "Receipt generation and reprinting",
    description:
      "Create receipts, archive invoice documents, and support receipt reprints when customers need copies.",
  },
  {
    title: "Cash and e-payment tracking",
    description:
      "Record tendered amounts, change, card payments, e-payment references, and cashier activity.",
  },
];

const operationsFeatures = [
  {
    title: "Inventory management",
    description:
      "Track products, categories, stock movement, availability, barcode details, and inventory adjustments.",
  },
  {
    title: "PWD, Senior, and custom discounts",
    description:
      "Handle Philippine discount workflows with PWD, Senior Citizen, and other discount types.",
  },
  {
    title: "VAT-aware product setup",
    description:
      "Configure VATable, exempt, and zero-rated product details for cleaner sales records.",
  },
  {
    title: "X-Reading and Z-Reading reports",
    description:
      "Review daily sales, cashier activity, terminal totals, and closing reports for business decisions.",
  },
  {
    title: "Role-based access",
    description:
      "Use admin, manager, and cashier roles so each team member sees the right POS tools.",
  },
  {
    title: "Cashier slots per terminal",
    description:
      "Create up to 2 cashier accounts for every company terminal, with available slots shown during account setup.",
  },
  {
    title: "Multi-terminal support",
    description:
      "Manage terminal registrations, subscriptions, printer settings, cashier capacity, and terminal status from one workspace.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [softwareJsonLd(), webPageJsonLd("features")],
};

export default function FeaturesPage() {
  return (
    <PageShell
      eyebrow="POSard features"
      title="Mobile POS features for checkout, inventory, and sales reports"
      description="POSard combines an easy POS system interface with inventory and sales tracking tools for Philippine retail, restaurant, cafe, and service businesses."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Checkout tools"
        description="Keep the counter moving with a small business POS workflow designed around cashiers, receipts, payments, and terminal sessions."
      >
        <BulletGrid items={checkoutFeatures} />
      </ContentSection>

      <ContentSection
        title="Business operations"
        description="POSard gives managers and owners the operational controls needed to run products, discounts, reports, roles, cashier limits, and terminals with less manual work."
      >
        <BulletGrid items={operationsFeatures} />
      </ContentSection>
    </PageShell>
  );
}
