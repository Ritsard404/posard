import type { Metadata } from "next";

import {
  BulletGrid,
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import { createPublicPageMetadata, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("terms");

const terms = [
  {
    title: "Lawful business use",
    description:
      "Use POSard only for lawful business purposes and authorized point-of-sale operations.",
  },
  {
    title: "Account security",
    description:
      "Users are responsible for protecting account credentials, PINs, device access, and assigned roles.",
  },
  {
    title: "Free access and optional billing",
    description:
      "POSard is currently free. If paid mode is introduced later, subscription terms may apply before enforcement is enabled.",
  },
  {
    title: "Service updates",
    description:
      "POSard may update or improve features, workflows, security controls, and service behavior over time.",
  },
  {
    title: "Data accuracy",
    description:
      "Each business is responsible for reviewing entries such as sales, expenses, inventory movement, supplier records, purchase orders, transfers, promotions, and customer balances.",
  },
];

const limitations = [
  {
    title: "User misuse",
    description:
      "POSard is not liable for losses caused by improper use, inaccurate entries, or unauthorized staff activity.",
  },
  {
    title: "External system failures",
    description:
      "POSard is not liable for outages or failures caused by third-party providers, networks, devices, or payment services.",
  },
  {
    title: "User negligence",
    description:
      "POSard is not liable for unauthorized access caused by weak passwords, shared credentials, or poor device security.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [webPageJsonLd("terms")],
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Terms and conditions"
      title="Terms and conditions for using POSard"
      description="By using POSard, you agree to responsible account use, lawful business operations, current free access terms, and any optional future billing terms when paid mode is enabled."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Usage terms"
        description="These terms summarize the expected use of POSard for POS checkout, inventory, purchasing, transfers, expenses, customers, promotions, kitchen workflow, reports, receipts, terminal access, and staff access."
      >
        <BulletGrid items={terms} />
      </ContentSection>

      <ContentSection
        title="Limitations"
        description="POSard provides software for business operations, but each business remains responsible for accurate use, account protection, and local compliance."
      >
        <BulletGrid items={limitations} />
      </ContentSection>
    </PageShell>
  );
}
