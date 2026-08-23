/**
 * Hash-based router (works on static hosts like GitHub Pages, no server
 * rewrites needed). Routes: calendar | systems | roster | settings | onboarding.
 * Splash is handled by app.js before the router starts.
 */
import { state } from "./state.js";
import { renderBottomNav } from "../components/bottom-nav.js";
import { icon } from "../components/icons.js";
import { isTourActive } from "../components/tour.js";
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

/* ---------- in-app back navigation (standalone PWAs) ----------
 *
 * Installed PWAs have no browser chrome: iOS/Android standalone has no
 * address bar, and on desktop (macOS/Windows/Linux) the window has no
 * toolbar either. The system back gesture exists only on Android — so on
 * iOS and desktop we provide our own back affordance: a floating pill on
 * non-home tabs plus keyboard shortcuts (Alt+←, or ⌘[ on macOS).
 * We keep our own route stack instead of relying on history entries, so
 * going back never leaves junk forward-entries behind.
 */
const routeStack = [];

function isStandaloneDisplay() {
  return (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true
  );
}

function trackRoute(route) {
  if (!SHELL_ROUTES.includes(route)) return; // never push splash/onboarding
  const len = routeStack.length;
  if (len && routeStack[len - 1] === route) return;
  // Browser/system back moves to the previous entry — pop instead of push.
  if (len > 1 && routeStack[len - 2] === route) {
    routeStack.pop();
    return;
  }
  routeStack.push(route);
  if (routeStack.length > 20) routeStack.shift();
}

/** True when there is an in-app route to go back to. */
export function canGoBack() {
  return routeStack.length > 1;
}

/** Go one step back in the app's own history. Returns true if it moved. */
export function goBack() {
  if (isTourActive() || !canGoBack()) return false;
  routeStack.pop();
  const prev = routeStack[routeStack.length - 1];
  try {
    history.replaceState(null, "", `#/${prev}`);
  } catch {
    /* sandboxed environments — fall through to a manual render */
  }
  render();
  return true;
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

  trackRoute(route);
  renderStandaloneBack(appEl, route);
}

/** Floating back pill, shown only in standalone mode on non-home tabs. */
function renderStandaloneBack(appEl, route) {
  const old = document.getElementById("standalone-back");
  if (old) old.remove();
  document.body.classList.remove("has-standalone-back");

  if (!isStandaloneDisplay()) return;
  if (!SHELL_ROUTES.includes(route) || route === "calendar") return;
  if (!canGoBack()) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "standalone-back";
  btn.className = "standalone-back";
  btn.setAttribute("aria-label", "بازگشت");
  btn.innerHTML = `${icon("back")}<span>بازگشت</span>`;
  btn.addEventListener("click", () => goBack());
  appEl.appendChild(btn);
  // Reserve room so the pill never covers the page header.
  document.body.classList.add("has-standalone-back");
}

export function initRouter(app) {
  appEl = app;
  window.addEventListener("hashchange", render);

  // Keyboard back shortcuts (desktop installed apps have no back button):
  // Alt+← works everywhere; ⌘[ is the macOS convention.
  // Disabled while the guided tour is open — navigating behind the tour
  // would leave the spotlight on the wrong page.
  window.addEventListener("keydown", (e) => {
    if (isTourActive()) return;
    const mac = /Mac|iPhone|iPad/i.test(
      navigator.platform || navigator.userAgent || "",
    );
    const hit =
      (e.altKey && e.key === "ArrowLeft") || (mac && e.metaKey && e.key === "[");
    if (!hit) return;
    const t = e.target;
    if (
      t &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
    )
      return;
    e.preventDefault();
    goBack();
  });

  render();
}
