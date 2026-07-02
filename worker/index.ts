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

type ServiceWorkerClient = {
  postMessage: (message: unknown) => void;
};

type ServiceWorkerScopeLike = {
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
const legacyRuntimeCacheNames = new Set([
  "apis",
  "others",
  "next-data",
  "static-data-assets",
  "cross-origin",
  "start-url",
]);

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
