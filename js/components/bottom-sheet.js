/**
 * Reusable bottom sheet (RTL, swipe-to-dismiss, backdrop + Escape to close).
 * One sheet at a time; opening a new sheet closes the previous one.
 *
 * Back-button support: every open overlay (sheets, the fullscreen table)
 * registers an onBack handler; the hardware/system back button (popstate)
 * closes the topmost overlay instead of leaving the app.
 */
import { icon } from "./icons.js";

let activeSheet = null;

/* ---------------- body scroll lock (counter-based) ---------------- */
/* Multiple overlays (sheets, fullscreen table, roster viewer) can stack;
   the page stays locked until the last one closes. */
let scrollLocks = 0;

export function lockBodyScroll() {
  scrollLocks += 1;
  document.body.classList.add("sheet-open");
}

export function unlockBodyScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.classList.remove("sheet-open");
}

/* ---------------- shared back-stack ---------------- */

const backHandlers = [];
let suppressNextPop = false;

/** Register an onBack callback; returns an unregister function. */
export function registerBackHandler(fn) {
  backHandlers.push(fn);
  return () => {
    const i = backHandlers.indexOf(fn);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

/**
 * Consume the history entry an overlay pushed when it opened (used when the
 * overlay is closed by its own button/Escape/swipe rather than by back).
 */
export function consumeBackEntry() {
  suppressNextPop = true;
  // Safety net: if the pop never fires (sandboxed environments), re-arm.
  setTimeout(() => {
    suppressNextPop = false;
  }, 150);
  try {
    history.back();
  } catch (err) {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (suppressNextPop) {
      suppressNextPop = false;
      return;
    }
    const fn = backHandlers[backHandlers.length - 1];
    if (fn) fn();
  });
}

/* ---------------- sheet ---------------- */

export function openSheet({ title = "", content = "", onMount = null, dismissable = true, onClose = null } = {}) {
  if (activeSheet) activeSheet.close();

  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title || "پنل");

  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <div class="sheet-handle" aria-hidden="true"></div>
    <header class="sheet-header">
      <h2 class="sheet-title">${title}</h2>
      <button type="button" class="icon-btn sheet-close" aria-label="بستن">${icon("close")}</button>
    </header>
    <div class="sheet-body"></div>`;

  const body = sheet.querySelector(".sheet-body");
  if (typeof content === "string") body.innerHTML = content;
  else if (content) body.appendChild(content);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  lockBodyScroll();

  requestAnimationFrame(() => overlay.classList.add("is-open"));

  let closed = false;
  let historyPushed = false;
  try {
    history.pushState({ sheet: true }, "");
    historyPushed = true;
  } catch (err) {
    /* sandboxed environments may block history — back just won't close sheets */
  }
  const unregisterBack = registerBackHandler(() => close(true));

  const close = (popClosed = false) => {
    if (closed) return;
    closed = true;
    unregisterBack();
    document.removeEventListener("keydown", onKey);
    overlay.classList.remove("is-open");
    unlockBodyScroll();
    setTimeout(() => {
      if (overlay.isConnected) overlay.remove();
    }, 240);
    if (activeSheet === api) activeSheet = null;
    if (onClose) onClose();
    if (historyPushed && !popClosed) consumeBackEntry();
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);

  if (dismissable) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }
  sheet.querySelector(".sheet-close").addEventListener("click", () => close());

  // Swipe down to dismiss
  let startY = null;
  let dragging = false;
  sheet.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      dragging = false;
    },
    { passive: true },
  );
  sheet.addEventListener(
    "touchmove",
    (e) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 8) dragging = true;
      if (dragging && dy > 0) {
        sheet.style.transform = `translateY(${Math.min(dy, 140)}px)`;
        overlay.style.background = "rgba(15, 23, 42, 0.25)";
      }
    },
    { passive: true },
  );
  sheet.addEventListener(
    "touchend",
    () => {
      const t = sheet.style.transform;
      sheet.style.transform = "";
      overlay.style.background = "";
      const dy = t ? parseFloat(t.replace("translateY(", "")) || 0 : 0;
      if (dy > 90) close();
      startY = null;
      dragging = false;
    },
    { passive: true },
  );

  const api = { close, body };
  activeSheet = api;
  if (onMount) onMount(api);
  return api;
}
