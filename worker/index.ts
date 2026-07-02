import {
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type RuntimeCaching,
} from "serwist";

type SyncEventLike = Event & {
  tag?: string;
  waitUntil: (promise: Promise<unknown>) => void;
};

type ServiceWorkerMessageEventLike = MessageEvent & {
  waitUntil: (promise: Promise<unknown>) => void;
};

type ExtendableEventLike = Event & {
  waitUntil: (promise: Promise<unknown>) => void;
};

declare const self: Window &
  typeof globalThis & {
    __SW_MANIFEST: Array<PrecacheEntry | string>;
  };

type ServiceWorkerClient = {
  postMessage: (message: unknown) => void;
};

type ServiceWorkerScopeLike = {
  location: Location;
  clients: {
    matchAll: (options: {
      type: "window";
      includeUncontrolled: boolean;
    }) => Promise<ServiceWorkerClient[]>;
    claim: () => Promise<void>;
  };
  addEventListener: typeof self.addEventListener;
};

const serviceWorker = self as unknown as ServiceWorkerScopeLike;
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
const legacyRuntimeCacheNames = new Set([
  "apis",
  "others",
  "next-data",
  "static-data-assets",
  "cross-origin",
  "start-url",
]);

function isProtectedRequest({ request, url }: { request: Request; url: URL }) {
  const isSameOrigin = serviceWorker.location.origin === url.origin;
  if (!isSameOrigin) {
    return false;
  }

  const pathname = url.pathname;
  return (
    request.mode === "navigate" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/data/") ||
    url.searchParams.has("_rsc") ||
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

function isSafeStaticAsset({ url }: { url: URL }) {
  const isSameOrigin = serviceWorker.location.origin === url.origin;
  if (!isSameOrigin) {
    return false;
  }

  const pathname = url.pathname;
  if (
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-") ||
    pathname.startsWith("/worker-") ||
    pathname.startsWith("/fallback-")
  ) {
    return false;
  }

  return (
    pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff|woff2|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(pathname)
  );
}

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: isProtectedRequest,
    handler: new NetworkOnly(),
    method: "GET",
  },
  {
    matcher: isSafeStaticAsset,
    handler: new StaleWhileRevalidate({
      cacheName: "posard-static-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    }),
    method: "GET",
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [],
    navigateFallback: "/_offline",
    navigateFallbackDenylist: [
      /^\/api\//,
      /^\/_next\/data\//,
      /[?&]_rsc=/,
    ],
  },
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching,
});

serwist.addEventListeners();

async function clearLegacyRuntimeCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(
        (cacheName) =>
          legacyRuntimeCacheNames.has(cacheName) ||
          cacheName.startsWith("workbox-runtime-apis") ||
          cacheName.startsWith("workbox-runtime-others") ||
          cacheName.startsWith("workbox-runtime-next-data") ||
          cacheName.startsWith("workbox-runtime-static-data-assets"),
      )
      .map((cacheName) => caches.delete(cacheName)),
  );
}

async function broadcastSyncTrigger() {
  const clients = await serviceWorker.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage({ type: "POSARD_SYNC_TRIGGER" });
  }
}

serviceWorker.addEventListener("activate", (event) => {
  const activateEvent = event as ExtendableEventLike;
  activateEvent.waitUntil(
    Promise.all([clearLegacyRuntimeCaches(), serviceWorker.clients.claim()]),
  );
});

serviceWorker.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEventLike;
  if (syncEvent.tag === "posard-sync-actions") {
    syncEvent.waitUntil(broadcastSyncTrigger());
  }
});

serviceWorker.addEventListener("message", (event) => {
  const messageEvent = event as ServiceWorkerMessageEventLike;
  if (messageEvent.data?.type === "POSARD_SYNC_TRIGGER") {
    messageEvent.waitUntil(broadcastSyncTrigger());
  }

  if (messageEvent.data?.type === "POSARD_CLEAR_PROTECTED_CACHES") {
    messageEvent.waitUntil(clearLegacyRuntimeCaches());
  }
});
