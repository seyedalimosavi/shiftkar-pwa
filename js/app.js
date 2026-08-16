/**
 * ShiftKar — application entry point.
 * Splash → (onboarding if not completed) → main application.
 */
import { initState, state } from "./core/state.js";
import { initRouter, navigate } from "./core/router.js";
import { renderSplash } from "./pages/splash.js";
import { initInstallPrompt } from "./components/install-prompt.js";
import { initUpdateCheck, hasVersionChanged } from "./components/update-check.js";
import { initAnalytics, trackPageView } from "./core/analytics.js";

/* ---------------- silent PWA updates ---------------- */

const UPDATE_CHECK_MS = 60 * 60 * 1000; // check for a new version once an hour
let updateBannerEl = null;

/**
 * Tell the user a newer version is installed and offer the reload.
 * Stays on screen for a few seconds; dismissing it just closes the banner
 * (the next update check will offer it again).
 */
function showUpdateBanner() {
  if (updateBannerEl || !document.body) return;
  const el = document.createElement("div");
  el.className = "update-banner";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span class="update-banner-text">نسخهٔ جدید آماده است</span>
    <button type="button" class="update-banner-action">به‌روزرسانی</button>`;
  const btn = el.querySelector(".update-banner-action");
  btn.addEventListener("click", () => window.location.reload());
  document.body.appendChild(el);
  updateBannerEl = el;
  // Auto-dismiss after a while — the reload stays one tap away.
  setTimeout(() => dismissUpdateBanner(), 8000);
}

function dismissUpdateBanner() {
  if (!updateBannerEl) return;
  const el = updateBannerEl;
  updateBannerEl = null;
  el.classList.add("is-leaving");
  setTimeout(() => el.remove(), 300);
}

/**
 * Wire a registration for silent updates:
 *  - `update()` on load and every UPDATE_CHECK_MS while the app is open;
 *  - when a new service worker installs, wait until it is active;
 *  - the new SW posts SK_UPDATE_READY → show the banner.
 */
function watchUpdates(reg) {
  // Keep this tab's view fresh: when a new SW finishes installing, wait for
  // it to activate (skipWaiting is called on install) and reload the page.
  reg.addEventListener("updatefound", () => {
    const next = reg.installing;
    if (!next) return;
    next.addEventListener("statechange", () => {
      if (next.state === "activated") {
        // The new SW now controls future navigations. Show the banner only
        // for a REAL version change — a first install must stay silent.
        if (!updateBannerEl && hasVersionChanged()) showUpdateBanner();
      }
    });
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SK_UPDATE_READY" && hasVersionChanged()) {
      showUpdateBanner();
    }
  });

  // Periodic check while the tab is open.
  setInterval(() => {
    reg.update().catch(() => {});
  }, UPDATE_CHECK_MS);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Skip registration while running under the Vite dev server so the
  // preview always serves fresh files; production builds register it.
  const isDev = import.meta.env?.DEV === true;
  if (isDev) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => {
        watchUpdates(reg);
        // Check right away so a stale cache is refreshed on this visit.
        reg.update().catch(() => {});
      })
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}

function boot() {
  initState();
  initInstallPrompt();
  initUpdateCheck();
  initAnalytics();
  registerServiceWorker();

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
