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

export function openSheet({ title = "", content = "", onMount = null, dismissable = true, onClose = null, expandable = true } = {}) {
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

  /* ---------------- expand / fullscreen ----------------
     A sheet with enough content can be expanded to full height: swipe UP
     on it, or keep scrolling when the body reaches the bottom. While
     fullscreen, swipe DOWN collapses it back (instead of dismissing); a
     full dismiss still works via the X, backdrop or the swipe from the
     collapsed state. */
  const bodyEl = sheet.querySelector(".sheet-body");
  let fullscreen = false;

  const isScrollable = () =>
    !!bodyEl && bodyEl.scrollHeight > bodyEl.clientHeight + 6;

  function setFullscreen(on) {
    fullscreen = on;
    sheet.classList.toggle("is-fullscreen", on);
  }

  // Scroll the body to the very bottom → the sheet expands.
  if (bodyEl) {
    bodyEl.addEventListener(
      "scroll",
      () => {
        if (!expandable || fullscreen || !isScrollable()) return;
        if (bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 10) {
          setFullscreen(true);
        }
      },
      { passive: true },
    );
  }

  // Swipe gestures: down = dismiss (collapsed) / collapse (fullscreen),
  // up = expand (only when the body is scrollable).
  let startY = null;
  let dragging = false;
  let dragMode = null; // "dismiss" | "collapse" | "expand"
  sheet.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      dragging = false;
      dragMode = null;
    },
    { passive: true },
  );
  sheet.addEventListener(
    "touchmove",
    (e) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (!dragging) {
        if (dy > 8) {
          dragging = true;
          dragMode = fullscreen ? "collapse" : "dismiss";
        } else if (dy < -30 && expandable && isScrollable() && !fullscreen) {
          dragging = true;
          dragMode = "expand";
        }
      }
      if (!dragging) return;
      if (dragMode === "dismiss" || dragMode === "collapse") {
        const d = Math.max(0, dy);
        sheet.style.transform = `translateY(${Math.min(d, 160)}px)`;
        overlay.style.background = "rgba(15, 23, 42, 0.25)";
      } else if (dragMode === "expand") {
        const d = Math.min(0, dy);
        sheet.style.transform = `translateY(${Math.max(d, -48)}px)`;
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
      if (dragMode === "expand") {
        if (dy < -24) setFullscreen(true);
      } else if (dragMode === "collapse") {
        if (dy > 90) setFullscreen(false);
      } else if (dragMode === "dismiss") {
        if (dy > 90) close();
      }
      startY = null;
      dragging = false;
      dragMode = null;
    },
    { passive: true },
  );

  const api = { close, body };
  activeSheet = api;
  if (onMount) onMount(api);
  return api;
}

/* ---------------- quiet close (guided tour) ---------------- */

/** Close the open sheet WITHOUT touching browser history (used by the guided
 *  tour: it navigates to the next tab right after closing overlays, and the
 *  normal close path's history.back() — which consumes the sheet's entry —
 *  would pop the tour's freshly-navigated entry and bounce the app back to
 *  the previous tab). The sheet's history entry is left in place (a
 *  duplicate of the current URL); it costs at most one extra back press that
 *  lands on the same page. */
export function closeSheetQuietly() {
  if (activeSheet) activeSheet.close(true);
}
