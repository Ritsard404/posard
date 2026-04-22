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
  siteConfig,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("contact");

const contactOptions = [
  {
    title: "Email",
    description: siteConfig.email,
  },
  {
    title: "Phone",
    description: siteConfig.phone,
  },
  {
    title: "Location",
    description: siteConfig.location,
  },
  {
    title: "Response target",
    description: "We aim to respond within 24 hours.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [organizationJsonLd(), websiteJsonLd(), webPageJsonLd("contact")],
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact POSard"
      title="Contact POSard support in Cebu, Philippines"
      description="Reach POSard for POS system inquiries, product support, setup questions, or partnership opportunities for Philippine small businesses."
    >
      <JsonLdScript data={jsonLd} />
      <ContentSection
        title="Get in touch"
        description="For inquiries, support, or partnership opportunities, contact the POSard team through the details below."
      >
        <BulletGrid items={contactOptions} />
      </ContentSection>
    </PageShell>
  );
}
