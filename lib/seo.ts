import type { Metadata } from "next";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://posard.vercel.app"
).replace(/\/$/, "");

export const siteConfig = {
  name: "POSard",
  url: siteUrl,
  title: "POS System for Restaurants, Retail, Services, and Sales Reports",
  description:
    "POSard is a mobile-first POS system for Philippine restaurants, cafes, retail stores, and service businesses that need checkout, inventory, receipts, discounts, and sales reports in one platform.",
  creator: "Ritsard",
  email: "support@posard.com",
  phone: "+63 XXX XXX XXXX",
  location: "Cebu, Philippines",
  price: {
    amount: 250,
    currency: "PHP",
    label: "PHP 250 per terminal per month",
  },
  keywords: [
    "POSard",
    "POSard POS",
    "POSard POS system",
    "POS system Philippines",
    "mobile POS",
    "small business POS",
    "retail POS",
    "restaurant POS",
    "cloud POS",
    "Cebu POS system",
    "small business POS software",
    "point of sale system",
    "inventory management POS",
    "sales reporting software",
  ],
};

export const publicPages = {
  about: {
    path: "/about",
    title: "About POSard POS System for Philippine Businesses",
    description:
      "Learn how POSard helps Philippine retail, restaurant, cafe, and service businesses manage checkout, inventory, reports, and multi-terminal cashier operations.",
  },
  features: {
    path: "/features",
    title: "POSard Features for Checkout, Inventory, and Sales Reports",
    description:
      "Explore POSard features for checkout, inventory tracking, PWD and Senior discounts, receipts, X and Z reports, terminals, and role-based cashier access.",
  },
  solutions: {
    path: "/solutions",
    title: "POSard Solutions for Retail, Cafes, Restaurants, and Services",
    description:
      "POSard supports Philippine retail stores, cafes, restaurants, startups, and service businesses with one cloud POS platform built for daily operations.",
  },
  pricing: {
    path: "/pricing",
    title: "POSard Pricing for Small Business POS Terminals",
    description:
      "POSard pricing is PHP 250 per terminal per month for businesses that need branded POS checkout, inventory tracking, and sales reporting without hidden fees.",
  },
  contact: {
    path: "/contact",
    title: "Contact POSard Support and Sales",
    description:
      "Contact POSard for POS system inquiries, implementation questions, support, and partnerships. Reach the Cebu, Philippines team by email.",
  },
  privacy: {
    path: "/privacy",
    title: "POSard Privacy Policy",
    description:
      "Read how POSard protects business, user, terminal, sales, and inventory data for POS users in the Philippines.",
  },
  terms: {
    path: "/terms",
    title: "POSard Terms and Conditions",
    description:
      "Review POSard terms covering lawful use, account security, per-terminal subscription billing, service updates, and limitations.",
  },
} as const;

export type PublicPageKey = keyof typeof publicPages;

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function createPublicPageMetadata(pageKey: PublicPageKey): Metadata {
  const page = publicPages[pageKey];

  return {
    title: page.title,
    description: page.description,
    keywords: siteConfig.keywords,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: absoluteUrl(page.path),
      siteName: siteConfig.name,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "POSard POS system for Philippine small businesses",
        },
      ],
      locale: "en_PH",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: "POSard POS System",
    url: siteConfig.url,
    logo: absoluteUrl("/branding/posard-logo.png"),
    email: siteConfig.email,
    telephone: siteConfig.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cebu",
      addressCountry: "PH",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: "POSard POS System",
    url: siteConfig.url,
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}

export function softwareJsonLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/#software`,
    name: siteConfig.name,
    alternateName: "POSard POS System",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    description: siteConfig.description,
    areaServed: "Philippines",
    featureList: [
      "Checkout and order workflows for restaurants, retail counters, cafes, and service desks",
      "Inventory and stock tracking",
      "PWD, Senior Citizen, and custom discount handling",
      "X-Reading and Z-Reading sales reports",
      "Receipt archive and receipt reprinting",
      "Role-based access for admins, managers, and cashiers",
      "Per-terminal subscriptions and cashier assignment",
    ],
    offers: {
      "@type": "Offer",
      price: siteConfig.price.amount,
      priceCurrency: siteConfig.price.currency,
      availability: "https://schema.org/InStock",
      description: siteConfig.price.label,
      url: absoluteUrl(publicPages.pricing.path),
    },
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}

export function webPageJsonLd(pageKey: PublicPageKey) {
  const page = publicPages[pageKey];

  return {
    "@context": "https://schema.org",
    "@type": pageKey === "contact" ? "ContactPage" : "WebPage",
    "@id": `${absoluteUrl(page.path)}#webpage`,
    url: absoluteUrl(page.path),
    name: page.title,
    description: page.description,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}
