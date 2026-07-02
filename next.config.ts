import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

type PwaPlugin = (options: Record<string, unknown>) => (config: NextConfig) => NextConfig;

const createPWA = withPWAInit as unknown as PwaPlugin;
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
    value: "no-store, no-cache, max-age=0, must-revalidate",
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
];
const runtimeCaching = [
  {
    urlPattern: ({ request, url }: { request: Request; url: URL }) => {
      const isSameOrigin = self.location.origin === url.origin;
      if (!isSameOrigin) {
        return false;
      }

      const pathname = url.pathname;
      const protectedPrefixes = [
        "/accounts",
        "/admin",
        "/approvals",
        "/companies",
        "/customers",
        "/dashboard",
        "/data-exchange",
        "/debts",
        "/expenses",
        "/feature-guide",
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
        "/subscriptions",
        "/suppliers",
        "/sync",
        "/terminals",
        "/transfers",
      ];

      return (
        request.mode === "navigate" ||
        pathname.startsWith("/api/") ||
        pathname.startsWith("/_next/data/") ||
        url.searchParams.has("_rsc") ||
        protectedPrefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        )
      );
    },
    handler: "NetworkOnly",
    method: "GET",
    options: {
      cacheName: "posard-network-only",
    },
  },
  {
    urlPattern: ({ url }: { url: URL }) => {
      const isSameOrigin = self.location.origin === url.origin;
      if (!isSameOrigin) {
        return false;
      }

      const pathname = url.pathname;
      if (
        pathname === "/sw.js" ||
        pathname.startsWith("/workbox-") ||
        pathname.startsWith("/worker-")
      ) {
        return false;
      }

      return (
        pathname.startsWith("/_next/static/") ||
        /\.(?:js|css|woff|woff2|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(pathname)
      );
    },
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "posard-static-assets",
      expiration: {
        maxEntries: 96,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
];

const withPWA = createPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
  scope: "/",
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching,
  cacheStartUrl: false,
  dynamicStartUrl: true,
  reloadOnOnline: false,
  customWorkerDir: "worker",
  publicExcludes: [
    "!pos-sw.js",
    "!sw.js",
    "!workbox-*.js",
    "!worker-*.js",
  ],
  fallbacks: {
    document: "/_offline",
  },
});

const nextConfig: NextConfig = {
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

export default withPWA(nextConfig);
