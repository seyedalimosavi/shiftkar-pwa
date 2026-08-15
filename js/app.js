/**
 * ShiftKar — application entry point.
 * Splash → (onboarding if not completed) → main application.
 */
import { initState, state } from "./core/state.js";
import { initRouter, navigate } from "./core/router.js";
import { renderSplash } from "./pages/splash.js";

/** Small banner telling the user the app is working from the local cache. */
function wireOfflineIndicator() {
  const show = (offline) => {
    let bar = document.getElementById("offline-bar");
    if (offline) {
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "offline-bar";
        bar.className = "offline-bar";
        bar.setAttribute("role", "status");
        bar.textContent = "آفلاین — داده‌ها از حافظهٔ دستگاه نمایش داده می‌شود";
        document.body.appendChild(bar);
        requestAnimationFrame(() => bar.classList.add("is-visible"));
      }
    } else if (bar) {
      bar.classList.remove("is-visible");
      setTimeout(() => bar.remove(), 320);
    }
  };
  window.addEventListener("offline", () => show(true));
  window.addEventListener("online", () => show(false));
  if (navigator.onLine === false) show(true);
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
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}

function boot() {
  initState();
  wireOfflineIndicator();
  registerServiceWorker();

  const app = document.getElementById("app");
  renderSplash(app);

  // Keep the splash brief, then enter the app.
  setTimeout(() => {
    initRouter(app);
    const target = state.settings.onboardingCompleted ? "calendar" : "onboarding";
    navigate(target);
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
