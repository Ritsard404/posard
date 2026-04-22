import type { Metadata } from "next";

import { SignUpForm } from "@/components/sign-up-form";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sign Up for POSard POS System Philippines",
  description:
    "Create a POSard merchant account for mobile POS checkout, inventory management, receipts, terminal subscriptions, and sales reports.",
  alternates: {
    canonical: "/auth/sign-up",
  },
  openGraph: {
    title: "Sign Up for POSard POS System Philippines",
    description:
      "Create a POSard merchant account for mobile POS checkout, inventory, receipts, terminals, and reports.",
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
      "Create a POSard merchant account for mobile POS checkout, inventory, receipts, terminals, and reports.",
    images: ["/opengraph-image"],
  },
};

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
