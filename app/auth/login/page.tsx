import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Login to Your POSard POS Terminal",
  description:
    "Sign in to POSard to access your POS terminal, dashboard, checkout tools, inventory, purchasing, expenses, reports, help guides, and account workspace.",
  alternates: {
    canonical: "/auth/login",
  },
  openGraph: {
    title: "Login to POSard",
    description:
      "Access your POSard POS terminal, dashboard, checkout, inventory, purchasing, expenses, permissions, and reports.",
    url: absoluteUrl("/auth/login"),
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "POSard login for POS terminal access",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Login to POSard",
    description:
      "Access your POSard POS terminal, dashboard, checkout, inventory, purchasing, expenses, permissions, and reports.",
    images: ["/opengraph-image"],
  },
};

export default function Page() {
  return (
    <AuthShell
      eyebrow="Secure sign in"
      title="Access your POSard workspace."
      description="Sign in to continue to your terminal dashboard, inventory controls, purchasing and expense tools, cashier tools, help guides, and daily sales reporting."
    >
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
