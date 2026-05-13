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
    title: "Offline-ready sync center",
    description:
      "Keep checkout moving when connectivity is unstable, then review failed, pending, or needs-review sync actions.",
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
    title: "Inventory health and stock ledger",
    description:
      "Track products, categories, stock movement, availability, barcode details, inventory adjustments, and low-stock items.",
  },
  {
    title: "Suppliers and purchase orders",
    description:
      "Review supplier records, purchase orders, receiving records, expected dates, and purchasing totals.",
  },
  {
    title: "Branch transfers",
    description:
      "Track stock movement between branches or storage locations with transfer status and item details.",
  },
  {
    title: "Expenses",
    description:
      "Record operating expenses by category, payment method, vendor, date, and branch for cleaner business visibility.",
  },
  {
    title: "Customers, loyalty, and debts",
    description:
      "Review customer records, loyalty activity, unpaid balances, debt collections, and transaction history from the business workspace.",
  },
  {
    title: "PWD, Senior, and custom discounts",
    description:
      "Handle Philippine discount workflows with PWD, Senior Citizen, and other discount types.",
  },
  {
    title: "Promotions",
    description:
      "Set up and monitor discount promotions, usage limits, active periods, redemption counts, and campaign status.",
  },
  {
    title: "Kitchen workflow",
    description:
      "Use kitchen tickets for restaurant and cafe order preparation, ready status, and handoff tracking.",
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
    title: "Permissions and approvals",
    description:
      "Use role permissions, staff access rules, manager approvals, operational approvals, and audit-friendly controls.",
  },
  {
    title: "Cashier slots per terminal",
    description:
      "Create up to 2 cashier accounts for every company terminal, with available slots shown during account setup.",
  },
  {
    title: "Multi-terminal support and help",
    description:
      "Manage terminal registrations, subscriptions, printer settings, cashier capacity, terminal status, and role-aware help guides from one workspace.",
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
      title="Mobile POS features for checkout, inventory, purchasing, and reports"
      description="POSard combines an easy POS interface with inventory, offline sync, purchasing, expenses, promotions, kitchen workflow, permissions, and sales tracking tools for Philippine businesses."
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
        description="POSard gives managers and owners the operational controls needed to run products, suppliers, purchase orders, transfers, expenses, customers, promotions, reports, roles, cashier limits, and terminals with less manual work."
      >
        <BulletGrid items={operationsFeatures} />
      </ContentSection>
    </PageShell>
  );
}
