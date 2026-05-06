import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

type PwaPlugin = (options: Record<string, unknown>) => (config: NextConfig) => NextConfig;

const createPWA = withPWAInit as unknown as PwaPlugin;

const withPWA = createPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
  scope: "/",
  skipWaiting: true,
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
        source: "/pos-sw.js",
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
