/**
 * Hash-based router (works on static hosts like GitHub Pages, no server
 * rewrites needed). Routes: calendar | systems | roster | settings | onboarding.
 * Splash is handled by app.js before the router starts.
 */
import { state } from "./state.js";
import { renderBottomNav } from "../components/bottom-nav.js";
import { renderSplash } from "../pages/splash.js";
import { renderOnboarding } from "../pages/onboarding.js";
import { renderCalendar } from "../pages/calendar.js";
import { renderSystems } from "../pages/systems.js";
import { renderRoster } from "../pages/roster.js";
import { renderSettings } from "../pages/settings.js";

const SHELL_ROUTES = ["calendar", "systems", "roster", "settings"];

const PAGES = {
  calendar: renderCalendar,
  systems: renderSystems,
  roster: renderRoster,
  settings: renderSettings,
  onboarding: renderOnboarding,
  splash: renderSplash,
};

export function getRoute() {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0] || "";
}

export function navigate(route) {
  const target = `#/${route}`;
  if (window.location.hash === target) {
    render();
    return;
  }
  // For shell tabs other than تقویم, keep the history entry below them
  // pointed at the calendar — a single back press returns to تقویم from
  // any tab instead of stepping through every tab in between.
  if (SHELL_ROUTES.includes(route) && route !== "calendar" && getRoute() !== "calendar") {
    try {
      history.replaceState(null, "", "#/calendar");
    } catch (err) {
      /* sandboxed environments may block replaceState — back just goes naturally */
    }
  }
  window.location.hash = target;
}

let appEl = null;

function render() {
  if (!appEl) return;
  let route = getRoute();

  // A fresh load (or a bare hash) always lands on the calendar — the app
  // does not restore the last visited tab after a refresh.
  if (!route) route = "calendar";

  // Onboarding guard: until completed, everything routes to onboarding.
  if (!state.settings.onboardingCompleted && route !== "onboarding") {
    route = "onboarding";
  }

  const isShell = SHELL_ROUTES.includes(route);
  appEl.innerHTML = "";

  const main = document.createElement("main");
  main.className = "page";
  main.id = "page";
  appEl.appendChild(main);

  const nav = document.createElement("nav");
  nav.id = "bottom-nav";
  nav.setAttribute("aria-label", "ناوبری اصلی");
  appEl.appendChild(nav);

  if (isShell) {
    renderBottomNav(nav, route);
  } else {
    nav.hidden = true;
  }

  const pageRenderer = PAGES[route] || renderCalendar;
  pageRenderer(main);
}

export function initRouter(app) {
  appEl = app;
  window.addEventListener("hashchange", render);
  render();
}
