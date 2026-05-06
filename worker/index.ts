type SyncEventLike = Event & {
  tag?: string;
  waitUntil: (promise: Promise<unknown>) => void;
};

type ServiceWorkerMessageEventLike = MessageEvent & {
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
  };
  addEventListener: typeof self.addEventListener;
};

const serviceWorker = self as unknown as ServiceWorkerScopeLike;

async function broadcastSyncTrigger() {
  const clients = await serviceWorker.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage({ type: "POSARD_SYNC_TRIGGER" });
  }
}

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
});
