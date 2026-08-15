/* ShiftKar service worker — offline-first caching. */
const VERSION = "1.5.0";
const CACHE_NAME = `shiftkar-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/variables.css",
  "./css/base.css",
  "./css/components.css",
  "./css/calendar.css",
  "./css/roster.css",
  "./css/responsive.css",
  "./js/app.js",
  "./js/core/state.js",
  "./js/core/router.js",
  "./js/core/storage.js",
  "./js/domain/jalali.js",
  "./js/domain/holidays.js",
  "./js/domain/shift-calculator.js",
  "./js/domain/models.js",
  "./js/pages/splash.js",
  "./js/pages/onboarding.js",
  "./js/pages/calendar.js",
  "./js/pages/systems.js",
  "./js/pages/roster.js",
  "./js/pages/settings.js",
  "./js/components/icons.js",
  "./js/components/bottom-nav.js",
  "./js/components/bottom-sheet.js",
  "./js/components/day-detail.js",
  "./js/components/month-picker.js",
  "./js/components/shift-badge.js",
  "./js/components/notes.js",
  "./js/components/dialogs.js",
  "./js/components/view-picker.js",
  "./js/components/install-prompt.js",
  "./assets/logo.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/roster-1405.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache each asset individually — a single missing file (e.g. after a
      // bundler renames it) must never break the install or offline support.
      await Promise.all(
        ASSETS.map((url) => cache.add(url).catch(() => {})),
      );
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

      // Assets: stale-while-revalidate.
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
