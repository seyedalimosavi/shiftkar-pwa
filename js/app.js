/**
 * ShiftKar — application entry point.
 * Splash → (onboarding if not completed) → main application.
 */
import { initState, state } from "./core/state.js";
import { initRouter, navigate } from "./core/router.js";
import { renderSplash } from "./pages/splash.js";
import { initInstallPrompt } from "./components/install-prompt.js";
import { initAnalytics, trackPageView } from "./core/analytics.js";
import { prefetchRosterImage } from "./pages/roster.js";

/* Silent service-worker refresh — no UI, no banner. The service worker
   serves the network-first on navigations, so deployed changes appear on
   the next visit; this just keeps the cached copy (and the SW itself) up to
   date in the background. */
const SW_REFRESH_MS = 60 * 60 * 1000; // refresh the cached copy once an hour

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Skip registration while running under the Vite dev server so the
  // preview always serves fresh files; production builds register it.
  const isDev = import.meta.env?.DEV === true;
  if (isDev) return;
  // Register immediately, not on window "load": Chrome can't fire
  // beforeinstallprompt (the native install prompt) until a service
  // worker is ACTIVE, and "load" waits for every image/font. Registering
  // at script-eval time makes installability (and the auto-prompt) appear
  // seconds earlier and far more reliably.
  navigator.serviceWorker
    .register("./service-worker.js")
    .then((reg) => {
      // Check for a new version right away, then periodically — new SWs
      // take over silently (skipWaiting) and refresh the cache.
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), SW_REFRESH_MS);
    })
    .catch((err) => console.warn("Service worker registration failed:", err));
}

function boot() {
  initState();
  initInstallPrompt();
  initAnalytics();
  registerServiceWorker();

  // Start downloading the لوحه picture in the background right away, so it
  // is cached and ready even if the user never opens the لوحه tab.
  prefetchRosterImage();

  const app = document.getElementById("app");
  renderSplash(app);

  // Keep the splash brief, then enter the app.
  setTimeout(() => {
    initRouter(app);
    const target = state.settings.onboardingCompleted ? "calendar" : "onboarding";
    navigate(target);

    // GA4 page views follow the hash router (initial + every change).
    const track = () => trackPageView(window.location.hash.replace(/^#\/?/, "").split("?")[0] || "calendar");
    window.addEventListener("hashchange", track);
    track();
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
