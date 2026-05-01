import type { Metadata } from "next";

import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sign Up for POSard POS System Philippines",
  description:
    "Create a POSard merchant account for restaurant, retail, cafe, or service POS checkout, inventory management, receipts, terminal subscriptions, and sales reports.",
  alternates: {
    canonical: "/auth/sign-up",
  },
  openGraph: {
    title: "Sign Up for POSard POS System Philippines",
    description:
      "Create a POSard merchant account for restaurant, retail, cafe, or service POS checkout, inventory, receipts, terminals, and reports.",
    url: absoluteUrl("/auth/sign-up"),
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "POSard sign up for Philippine small businesses",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up for POSard POS System Philippines",
    description:
      "Create a POSard merchant account for restaurant, retail, cafe, or service POS checkout, inventory, receipts, terminals, and reports.",
    images: ["/opengraph-image"],
  },
};

export default function Page() {
  return (
    <AuthShell
      eyebrow="Merchant onboarding"
      title="Create your POSard merchant account."
      description="Start with a branded POS workflow for orders, checkout, receipts, inventory, and sales reporting, then wait for admin approval to activate access."
    >
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </AuthShell>
  );
}
