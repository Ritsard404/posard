import type { Metadata } from "next";
import { featureCatalog } from "@/lib/feature-catalog";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://posard.vercel.app"
).replace(/\/$/, "");

export const siteConfig = {
  name: "POSard",
  url: siteUrl,
  title: "POSard - Modern POS System",
  description:
    "POSard is a modern point-of-sale system for small businesses, restaurants, and retail stores.",
  creator: "POSard",
  email: "support@posard.com",
  phone: "+63 XXX XXX XXXX",
  location: "Cebu, Philippines",
  price: {
    amount: 0,
    currency: "PHP",
    label: "Free right now",
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
    "purchase order POS",
    "expense tracking POS",
    "kitchen POS workflow",
    "offline POS sync",
    "sales reporting software",
  ],
};

export const publicPages = {
  about: {
    path: "/about",
    title: "About POSard POS System for Philippine Businesses",
    description:
      "Learn how POSard helps Philippine retail, restaurant, cafe, and service businesses manage checkout, inventory, purchasing, expenses, reports, permissions, and multi-terminal operations.",
  },
  features: {
    path: "/features",
    title: "POSard Features for Checkout, Inventory, Purchasing, and Reports",
    description:
      "Explore POSard features for checkout, offline sync, inventory health, suppliers, purchase orders, transfers, expenses, customers, promotions, kitchen tickets, reports, terminals, and role-based access.",
  },
  solutions: {
    path: "/solutions",
    title: "POSard Solutions for Retail, Cafes, Restaurants, and Services",
    description:
      "POSard supports Philippine retail stores, cafes, restaurants, startups, and service businesses with one cloud POS platform for sales, inventory, purchasing, expenses, reports, and staff control.",
  },
  pricing: {
    path: "/pricing",
    title: "POSard Free Pricing for Small Business POS",
    description:
      "POSard is free right now for businesses that need POS checkout, inventory tracking, purchasing, expenses, reports, permissions, and terminal management without active subscription charges.",
  },
  download: {
    path: "/download",
    title: "Download POSard App for Android, Web, and Windows",
    description:
      "Download the POSard Android APK when available, install POSard from the browser as a web app, and see Windows installer availability without confusing APK and EXE files.",
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
      "Read how POSard protects business, user, terminal, sales, inventory, purchasing, expense, customer, report, and permission data for POS users in the Philippines.",
  },
  terms: {
    path: "/terms",
    title: "POSard Terms and Conditions",
    description:
      "Review POSard terms covering lawful use, account security, current free access, optional future billing, operational data accuracy, service updates, and limitations.",
  },
} as const;

export type PublicPageKey = keyof typeof publicPages;

export const protectedPageMetadata = {
  pos: {
    path: "/pos",
    title: "POS Terminal",
    description:
      "Run POSard checkout, cashier sessions, carts, payments, receipts, and offline-ready sales from the POS terminal.",
  },
  inventory: {
    path: "/product",
    title: "Inventory",
    description:
      "Manage POSard products, categories, pricing, barcode details, stock tracking, and inventory availability.",
  },
  reports: {
    path: "/reports",
    title: "Reports",
    description:
      "Review POSard sales, cashier activity, inventory health, debt collections, X-reading, Z-reading, and business performance reports.",
  },
  settings: {
    path: "/settings",
    title: "Settings",
    description:
      "Manage POSard workspace settings, terminal configuration, business controls, and operational preferences.",
  },
} as const;

export type ProtectedPageKey = keyof typeof protectedPageMetadata;

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

export function createProtectedPageMetadata(pageKey: ProtectedPageKey): Metadata {
  const page = protectedPageMetadata[pageKey];

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: page.path,
    },
    robots: {
      index: false,
      follow: false,
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
    featureList: featureCatalog.map((feature) => feature.title),
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
