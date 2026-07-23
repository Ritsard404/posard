import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/offline",
        "/api/",
        "/accounts",
        "/admin",
        "/approvals",
        "/auth/",
        "/companies",
        "/customers",
        "/data-exchange",
        "/dashboard",
        "/debts",
        "/expenses",
        "/help",
        "/inventory-ledger",
        "/kitchen",
        "/notifications",
        "/pos",
        "/product",
        "/promotions",
        "/purchase-orders",
        "/report",
        "/reports",
        "/settings",
        "/setup-company",
        "/suppliers",
        "/subscriptions",
        "/sync",
        "/terminals",
        "/transfers",
        "/unauthorized",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
