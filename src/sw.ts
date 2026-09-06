// Paper service worker (injectManifest).
// - App shell: precached, CacheFirst.
// - Thumbnails (/api/v2/files/*variant=thumb): immutable → CacheFirst, 1yr.
// - Originals + list/detail/categories JSON: NetworkFirst with bounded cache
//   (offline reads of previously opened items keep working).
// - Upload outbox: Background Sync drains IndexedDB queue when back online.
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { get, keys, del } from "idb-keyval";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};
declare type SyncEvent = Event & { tag: string; waitUntil(p: Promise<unknown>): void };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Immutable thumbnails: cache forever (R2 key never reused).
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/v2/files/") && url.searchParams.get("variant") !== "orig",
  new CacheFirst({
    cacheName: "paper-thumbs",
    plugins: [new ExpirationPlugin({ maxEntries: 2000, maxAgeSeconds: 365 * 24 * 3600 })],
  })
);

// Originals: network first, fall back to cache offline.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/v2/files/"),
  new NetworkFirst({
    cacheName: "paper-orig",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 })],
  })
);

// Read APIs: network first with short timeout → cached JSON offline.
registerRoute(
  ({ url }) =>
    url.pathname === "/api/v2/receipts" ||
    url.pathname.startsWith("/api/v2/receipts/") ||
    url.pathname === "/api/v2/categories",
  new NetworkFirst({
    cacheName: "paper-api",
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 })],
  })
);

interface QueuedUpload {
  key: string;
  file: File;
  thumb: Blob | null;
  meta: { category: string; owner?: string | null; notes?: string | null };
}

async function drainOutbox(): Promise<void> {
  const all = await keys();
  for (const k of all) {
    if (typeof k !== "string" || !k.startsWith("outbox:")) continue;
    const item = await get<QueuedUpload>(k);
    if (!item) continue;
    try {
      const form = new FormData();
      form.append("file", item.file, item.file.name);
      if (item.thumb) form.append("thumb", item.thumb, "thumb.webp");
      form.append("category", item.meta.category);
      if (item.meta.owner) form.append("owner", item.meta.owner);
      if (item.meta.notes) form.append("notes", item.meta.notes);
      const res = await fetch("/api/v2/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await del(k);
      // Tell open clients to refresh lists.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) c.postMessage({ type: "paper-outbox-drained", key: item.key });
    } catch {
      // Keep queued; next sync / online event retries.
    }
  }
}

self.addEventListener("sync", (event: Event) => {
  if ((event as SyncEvent).tag === "paper-uploads") {
    (event as SyncEvent).waitUntil(drainOutbox());
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "paper-drain-outbox") {
    event.waitUntil(drainOutbox());
  }
});
