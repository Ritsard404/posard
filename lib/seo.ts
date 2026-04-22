import type { Metadata } from "next";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://posard.vercel.app"
).replace(/\/$/, "");

export const siteConfig = {
  name: "POSard",
  url: siteUrl,
  title: "POS System Philippines for Small Businesses",
  description:
    "POSard is a mobile-first POS system in the Philippines for checkout, inventory, discounts, receipts, terminal subscriptions, and sales reports.",
  creator: "Ritsard",
  email: "support@posard.com",
  phone: "+63 XXX XXX XXXX",
  location: "Cebu, Philippines",
  price: {
    amount: 500,
    currency: "PHP",
    label: "PHP 500 per terminal per month",
  },
  keywords: [
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
    title: "POS System Philippines for Modern Businesses",
    description:
      "Learn how POSard helps Philippine retail, restaurant, and service businesses run mobile POS checkout, inventory, reports, and terminals.",
  },
  features: {
    path: "/features",
    title: "Mobile POS Features for Sales, Inventory, and Reports",
    description:
      "Explore POSard features for checkout, inventory tracking, PWD and Senior discounts, X and Z reports, receipts, terminals, and roles.",
  },
  solutions: {
    path: "/solutions",
    title: "POS Solutions for Retail, Restaurants, and Services",
    description:
      "POSard supports retail stores, restaurants, cafes, startups, and service businesses in the Philippines with one cloud POS platform.",
  },
  pricing: {
    path: "/pricing",
    title: "Affordable POS System Pricing in the Philippines",
    description:
      "POSard pricing is PHP 500 per terminal per month with a default terminal for the first registered user and no hidden fees.",
  },
  contact: {
    path: "/contact",
    title: "Contact POSard Support in Cebu, Philippines",
    description:
      "Contact POSard for POS system inquiries, support, and partnerships. Email support@posard.com or reach the Cebu, Philippines team.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy for POSard POS System",
    description:
      "Read how POSard protects business, user, terminal, sales, and inventory data for POS users in the Philippines.",
  },
  terms: {
    path: "/terms",
    title: "Terms and Conditions for POSard",
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
    url: siteConfig.url,
    logo: absoluteUrl("/branding/posard-favicon.png"),
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
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    description: siteConfig.description,
    areaServed: "Philippines",
    featureList: [
      "Mobile point-of-sale checkout",
      "Inventory management",
      "PWD, Senior Citizen, and custom discounts",
      "X-Reading and Z-Reading reports",
      "Receipt archive and reprinting",
      "Role-based access for admins, managers, and cashiers",
      "Per-terminal subscriptions",
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
