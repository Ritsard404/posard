import Link from "next/link";
import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";

import {
  BulletGrid,
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import { StorageImage } from "@/components/storage/StorageImage";
import { Button } from "@/components/ui/button";
import { systemConfigurationService } from "@/app/(protected)/admin/_services/system-configuration.service";
import {
  createPublicPageMetadata,
  publicPages,
  softwareJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata("pricing");

const pricingDetails = [
  {
    title: "Free right now",
    description:
      "Use POSard checkout, inventory, reports, permissions, and terminal management without active subscription charges.",
  },
  {
    title: "Default terminal included",
    description:
      "The first registered user automatically receives a default terminal during onboarding.",
  },
  {
    title: "Scalable as you grow",
    description:
      "Add more terminals when you add counters, devices, branches, or teams.",
  },
  {
    title: "Cashier access included",
    description:
      "Cashier, manager, and admin access stays role-based so teams can work with the right permissions.",
  },
  {
    title: "Operations modules included",
    description:
      "Inventory health, suppliers, purchase orders, transfers, expenses, customers, promotions, kitchen workflow, approvals, permissions, and help guides are part of the workspace.",
  },
  {
    title: "Offline and reporting tools included",
    description:
      "Use offline-ready checkout support, sync review, X-Reading, Z-Reading, sales reports, and inventory visibility without separate module fees.",
  },
  {
    title: "Optional donations",
    description:
      "Donations may be shown as an optional way to support POSard, but they do not unlock features automatically.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [softwareJsonLd(), webPageJsonLd("pricing")],
};

export default async function PricingPage() {
  const config = await systemConfigurationService.get();
  const showDonation =
    config.donationEnabled &&
    (config.donationImageUrl ||
      config.donationProviderName ||
      config.donationAccountHolder ||
      config.donationAccountDetail ||
      config.donationMessage);

  return (
    <PageShell
      eyebrow="POSard pricing"
      title="POSard is free right now"
      description="Use POSard for checkout, inventory, purchasing, expenses, reports, permissions, and terminal management without active subscription charges. Paid mode can be introduced later by the POSard owner/admin."
    >
      <JsonLdScript data={jsonLd} />
      <section className="rounded-md border bg-background p-6 shadow-sm md:p-8">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">
          Current access
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-5xl font-heading font-extrabold">
              Free
            </p>
            <p className="mt-2 text-muted-foreground">
              No active per-terminal subscription charge right now
            </p>
          </div>
          <Button asChild size="lg" className="min-h-12">
            <Link href="/auth/sign-up">Create merchant account</Link>
          </Button>
        </div>
      </section>

      <ContentSection
        title="What free access includes"
        description="Free access includes the POSard workflow for checkout, inventory and stock ledger, suppliers, purchase orders, transfers, expenses, customers, promotions, kitchen workflow, reports, receipts, roles, terminal configuration, and help guides."
      >
        <BulletGrid items={pricingDetails} />
      </ContentSection>

      {showDonation ? (
        <ContentSection
          title={config.donationTitle ?? "Support POSard"}
          description={config.donationMessage ?? "Donations are optional and help support ongoing POSard improvements."}
        >
          <div className="grid max-w-4xl gap-5 rounded-md border bg-background p-5 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/20">
              <StorageImage
                src={config.donationImageUrl}
                alt="POSard optional donation QR"
                fill
                sizes="256px"
                className="object-contain p-2"
                fallback={<ImageIcon className="size-10 text-muted-foreground/40" />}
              />
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {config.donationProviderName ? (
                <DonationField label="Provider" value={config.donationProviderName} />
              ) : null}
              {config.donationAccountHolder ? (
                <DonationField label="Account holder" value={config.donationAccountHolder} />
              ) : null}
              {config.donationAccountDetail ? (
                <DonationField label="Account details" value={config.donationAccountDetail} />
              ) : null}
              <p className="leading-6">
                Donations are optional. Sending a donation does not automatically change account status or unlock features.
              </p>
            </div>
          </div>
        </ContentSection>
      ) : null}

      <ContentSection title="Need support?">
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

function DonationField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold text-foreground">{label}:</span> {value}
    </p>
  );
}
