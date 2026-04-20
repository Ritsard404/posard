import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/accounts",
        "/admin",
        "/approvals",
        "/auth/confirm",
        "/auth/error",
        "/auth/forgot-password",
        "/auth/sign-up-success",
        "/auth/update-password",
        "/companies",
        "/dashboard",
        "/pos",
        "/product",
        "/report",
        "/settings",
        "/setup-company",
        "/subscriptions",
        "/terminals",
        "/unauthorized",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
