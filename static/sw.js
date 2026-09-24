const legacyCachePrefixes = ["paper-", "workbox-precache-v2-"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => legacyCachePrefixes.some((prefix) => name.startsWith(prefix)))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim()),
  );
});
