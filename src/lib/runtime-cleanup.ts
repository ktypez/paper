const LEGACY_CACHE_PREFIXES = ["paper-", "workbox-precache-v2-"];

export async function removeLegacyRuntime() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const names = await caches.keys().catch(() => []);
    await Promise.all(
      names
        .filter((name) => LEGACY_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
        .map((name) => caches.delete(name)),
    );
  }
}
