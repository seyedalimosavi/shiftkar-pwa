/**
 * Google Analytics 4 — optional and opt-in by configuration.
 *
 * The app stays fully offline/lean by default: no tracking script is loaded
 * until the user pastes a GA4 Measurement ID (settings → گوگل آنالیتیکس).
 * The ID is stored in localStorage (device-local, like all other settings).
 *
 * Loads gtag dynamically, fires a page_view on every hash route change, and
 * leaves the service worker untouched (external requests are not cached).
 */

const GA_ID_KEY = "shiftkar.gaId.v1";

let loaded = false;

export function getGaId() {
  try {
    return localStorage.getItem(GA_ID_KEY) || "";
  } catch {
    return "";
  }
}

export function setGaId(id) {
  try {
    if (id) localStorage.setItem(GA_ID_KEY, id.trim());
    else localStorage.removeItem(GA_ID_KEY);
  } catch {
    /* storage unavailable — analytics stays off */
  }
  loaded = false;
  loadGtag();
}

/** Loads the gtag script once, only if a measurement ID is configured. */
function loadGtag() {
  const id = getGaId();
  if (!id || loaded || typeof window === "undefined") return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.setAttribute("crossorigin", "anonymous");
  document.head.appendChild(script);
}

/** Fire a page_view for the current hash route. */
export function trackPageView(route) {
  const id = getGaId();
  if (!id) return;
  if (!loaded) loadGtag();
  const page = route || "calendar";
  if (window.gtag) {
    window.gtag("event", "page_view", { page_path: `/${page}` });
  }
}

/** Called once at boot — starts tracking if a measurement ID exists. */
export function initAnalytics() {
  loadGtag();
}
