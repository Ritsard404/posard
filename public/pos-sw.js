self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function broadcastSyncTrigger() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage({ type: "POSARD_SYNC_TRIGGER" });
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "posard-sync-actions") {
    event.waitUntil(broadcastSyncTrigger());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "POSARD_SYNC_TRIGGER") {
    event.waitUntil(broadcastSyncTrigger());
  }
});
