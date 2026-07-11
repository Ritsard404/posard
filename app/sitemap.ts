import type { MetadataRoute } from "next";
import { absoluteUrl, publicPages } from "@/lib/seo";

const publicRoutes = [
  { path: "/", priority: 1 },
  { path: publicPages.features.path, priority: 0.9 },
  { path: publicPages.pricing.path, priority: 0.9 },
  { path: publicPages.solutions.path, priority: 0.85 },
  { path: publicPages.download.path, priority: 0.8 },
  { path: publicPages.about.path, priority: 0.8 },
  { path: publicPages.contact.path, priority: 0.7 },
  { path: publicPages.privacy.path, priority: 0.5 },
  { path: publicPages.terms.path, priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: "monthly",
    priority: route.priority,
  }));
}
