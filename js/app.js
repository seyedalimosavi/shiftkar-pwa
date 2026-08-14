/**
 * ShiftKar — application entry point.
 * Splash → (onboarding if not completed) → main application.
 */
import { initState, state } from "./core/state.js";
import { initRouter, navigate } from "./core/router.js";
import { renderSplash } from "./pages/splash.js";

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
  registerServiceWorker();

  const app = document.getElementById("app");
  renderSplash(app);

  // Keep the splash brief, then enter the app.
  setTimeout(() => {
    initRouter(app);
    const target = state.settings.onboardingCompleted
      ? state.settings.lastScreenRoute || "calendar"
      : "onboarding";
    navigate(target);
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
