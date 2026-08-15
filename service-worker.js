/* ShiftKar service worker — offline-first caching. */
const VERSION = "1.2.0";
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
  "./assets/logo.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/roster-1405.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
