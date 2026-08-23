/* ShiftKar service worker — offline-first caching.
 *
 * The production build (vite build) emits hashed asset filenames
 * (dist/assets/index-*.js etc.), so instead of pre-caching a fixed file
 * list we pre-cache just the shell (./ + index.html) and cache every
 * same-origin GET at runtime — the first visit downloads the whole app,
 * and the hashed names mean stale files are never served.
 */
const VERSION = "50";
const CACHE_NAME = `shiftkar-${VERSION}`;

/* Only the shell — everything else (hashed JS/CSS/assets) is cached on
   first use by the fetch handler below. The لوحه picture is pre-cached
   here too so it is downloaded in the background on first use and ready
   offline even if the user never visits the tab.

   ⚠️  MAINTENANCE: when the roster image changes (new year, updated file),
       update the filename below AND bump VERSION at the top of this file.
       Failing to update the filename means the install pre-cache silently
       skips the image (the .catch(() => {}) swallows a 404). */
const SHELL = ["./", "./index.html", "./assets/roster-1405.png"];

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

/* Runtime strategy:
   - Navigations: NETWORK-FIRST — the deployed source is served immediately
     (that's what "receive the change right away" means), with the cached
     shell as the fallback when offline.
   - Assets: stale-while-revalidate — cached instantly, refreshed in the
     background; hashed filenames mean old files are never mixed in.
   Everything same-origin is cached; external requests (GA, contact links
   etc.) are left to the browser. */
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
        // Pages: network first (fresh source immediately), cached shell as
        // the fallback for offline deep links / refreshes.
        const fresh = await refresh();
        if (fresh) return fresh;
        return cached || (await caches.match("./index.html", { ignoreSearch: true }));
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
