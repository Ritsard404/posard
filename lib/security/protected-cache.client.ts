"use client";

const protectedCacheNames = new Set([
  "apis",
  "others",
  "next-data",
  "static-data-assets",
  "cross-origin",
  "start-url",
  "posard-network-only",
]);

function shouldDeleteCache(cacheName: string) {
  return (
    protectedCacheNames.has(cacheName) ||
    cacheName.startsWith("workbox-runtime-apis") ||
    cacheName.startsWith("workbox-runtime-others") ||
    cacheName.startsWith("workbox-runtime-next-data") ||
    cacheName.startsWith("workbox-runtime-static-data-assets")
  );
}

export async function clearProtectedBrowserCaches() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames
          .filter(shouldDeleteCache)
          .map((cacheName) => window.caches.delete(cacheName)),
      );
    }

    navigator.serviceWorker?.controller?.postMessage({
      type: "POSARD_CLEAR_PROTECTED_CACHES",
    });
  } catch (error) {
    console.warn("Unable to clear protected browser caches", error);
  }
}
