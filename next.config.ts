import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

type SerwistPlugin = (options: Record<string, unknown>) => (config: NextConfig) => NextConfig;

const createSerwist = withSerwistInit as unknown as SerwistPlugin;
const offlinePageRevision = createHash("sha256")
  .update(readFileSync("app/offline/page.tsx"))
  .digest("hex");
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://api.dicebear.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
  "worker-src 'self' blob:",
].join("; ");
const globalSecurityHeaders = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: cspReportOnly,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(self), bluetooth=(self), serial=(self)",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];
const sensitiveDownloadHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, no-cache, max-age=0, must-revalidate",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Vary",
    value: "Accept-Encoding",
  },
];
const withSerwist = createSerwist({
  additionalPrecacheEntries: [
    { url: "/offline", revision: offlinePageRevision },
  ],
  disable: process.env.NODE_ENV === "development",
  register: true,
  swSrc: "worker/index.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  scope: "/",
  cacheOnNavigation: false,
  reloadOnOnline: false,
  globPublicPatterns: [
    "apple-icon.png",
    "branding/posard-logo.png",
    "images/**/*",
    "manifest.json",
    "pwa-icon-*.png",
    "pwa-maskable-512.png",
  ],
});

const nextConfig: NextConfig = {
  compress: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: globalSecurityHeaders,
      },
      {
        source: "/reports/export",
        headers: sensitiveDownloadHeaders,
      },
      {
        source: "/data-exchange/backup/export",
        headers: sensitiveDownloadHeaders,
      },
      {
        source: "/data-exchange/product-catalog/export",
        headers: sensitiveDownloadHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/:serviceWorker(sw\\.js|workbox-.*\\.js|worker-.*\\.js)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withSerwist(nextConfig);
