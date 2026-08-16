/**
 * Google Analytics 4.
 *
 * The app ships with a default Measurement ID (G-1C1B6LT0DT) so visits are
 * counted for everyone out of the box. The Settings field (تنظیمات → آمار
 * بازدید) can override it per-device — useful for testing or a different
 * property; an empty value there disables tracking on that device.
 *
 * gtag loads dynamically, fires a page_view on every hash route change, and
 * the service worker leaves external requests (GA included) untouched.
 */

const GA_ID_KEY = "shiftkar.gaId.v1";
const DEFAULT_GA_ID = "G-1C1B6LT0DT";

let loaded = false;

export function getGaId() {
  try {
    return localStorage.getItem(GA_ID_KEY) || DEFAULT_GA_ID;
  } catch {
    return DEFAULT_GA_ID;
  }
}

/** The device-level override only (empty when using the app default). */
export function getStoredGaId() {
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

  if (typeof document === "undefined" || !document.head) return; // non-browser environments
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
