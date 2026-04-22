import type { Metadata } from "next";

import {
  BulletGrid,
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import { createPublicPageMetadata, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("privacy");

const privacyPoints = [
  {
    title: "Necessary data only",
    description:
      "POSard collects the business, user, terminal, product, inventory, and transaction data needed to operate the POS system.",
  },
  {
    title: "Secure storage",
    description:
      "Business data is handled with security controls designed to protect accounts, roles, and operational records.",
  },
  {
    title: "No selling of data",
    description:
      "POSard does not sell user or business data to third parties.",
  },
  {
    title: "Account control",
    description:
      "Users and business owners can manage account information and access according to their assigned role.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [webPageJsonLd("privacy")],
};

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy policy"
      title="Privacy policy for POSard users and businesses"
      description="POSard respects your privacy and is committed to protecting the data used to run sales, inventory, terminals, receipts, reports, and user accounts."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="How POSard handles data"
        description="This summary explains the privacy principles behind POSard as a secure POS Philippines platform for small business operations."
      >
        <BulletGrid items={privacyPoints} />
      </ContentSection>

      <ContentSection title="Privacy commitment">
        <div className="max-w-4xl space-y-5 text-base leading-7 text-muted-foreground">
          <p>
            POSard collects information that supports account access, business
            setup, terminal configuration, product records, transactions,
            receipts, inventory movement, and reports. This data is used to
            deliver the POS service and support authorized business workflows.
          </p>
          <p>
            POSard does not sell or share business data with third parties for
            advertising. Access to account and business information should be
            managed carefully by each business through its authorized users.
          </p>
        </div>
      </ContentSection>
    </PageShell>
  );
}
