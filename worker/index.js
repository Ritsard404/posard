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

async function broadcastSyncTrigger() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage({ type: "POSARD_SYNC_TRIGGER" });
  }
}
