/* ShiftKar service worker — offline-first caching.
 *
 * The production build (vite build) emits hashed asset filenames
 * (dist/assets/index-*.js etc.), so instead of pre-caching a fixed file
 * list we pre-cache just the shell (./ + index.html) and cache every
 * same-origin GET at runtime — the first visit downloads the whole app,
 * and the hashed names mean stale files are never served.
 */
const VERSION = "1.8.0";
const CACHE_NAME = `shiftkar-${VERSION}`;

/* Only the shell — everything else (hashed JS/CSS/assets) is cached on
   first use by the fetch handler below. */
const SHELL = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache the shell individually — a missing file must never break install.
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Runtime strategy — stale-while-revalidate:
   - serve the cached copy instantly (fast, works offline)
   - fetch a fresh copy in the background and update the cache
   - navigations that miss the cache fall back to the app shell
   Everything same-origin is cached; external requests (contact links etc.)
   are left to the browser. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });

      const refresh = async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const copy = res.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(req, copy);
          }
          return res;
        } catch (err) {
          return null;
        }
      };

      if (req.mode === "navigate") {
        // Pages: cached shell first, fresh copy in the background, and the
        // app shell as a fallback for any offline deep link / refresh.
        if (cached) {
          refresh().catch(() => {});
          return cached;
        }
        return (
          (await refresh()) ||
          (await caches.match("./index.html", { ignoreSearch: true }))
        );
      }

      // Assets (hashed JS/CSS/icons/etc.): stale-while-revalidate.
      if (cached) {
        refresh().catch(() => {});
        return cached;
      }
      return (
        (await refresh()) ||
        (await caches.match("./index.html", { ignoreSearch: true }))
      );
    })(),
  );
});
