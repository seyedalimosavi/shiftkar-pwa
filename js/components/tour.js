/**
 * Guided tour — a one-time, spotlight-style walkthrough of the whole app.
 *
 * While the tour is open the user can ONLY interact with the guide itself:
 *  - a full-screen overlay dims + blurs everything EXCEPT the showcased
 *    element — a radial-gradient mask punches a transparent hole over it,
 *    so it stays crisp (no DOM cloning, no fragile clip-path);
 *  - a glowing ring marks the showcased element;
 *  - taps, wheel and touch scrolling outside the tooltip are blocked;
 *  - steps auto-scroll the target into view and can switch tabs and trigger
 *    small UI actions (switch month, switch view) automatically.
 *
 * Runs once per device (like onboarding); replayable from Settings → راهنمای شروع.
 */
import { TOUR_STEPS } from "./tour-steps.js";
import { navigate, getRoute } from "../core/router.js";
import { state } from "../core/state.js";

const SEEN_KEY = "shiftkar.tourSeen.v1";

let active = false;
let stepIndex = 0;
let rootEl = null;
let savedTab = null;
let savedView = null;
let savedScrollY = 0;

function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/* ---------------- helpers ---------------- */

function waitFor(fn, timeout = 4000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const poll = () => {
      const value = fn();
      if (value) return resolve(value);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(poll, 60);
    };
    poll();
  });
}

function toPersian(n) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/** Run the step's click action (reveals the element being explained). */
async function runAction(action) {
  switch (action) {
    case "nextMonth":
      document.querySelector('.cal-nav-btn[data-action="next"]')?.click();
      break;
    case "goToday":
      document.querySelector('[data-action="today"]')?.click();
      break;
    case "toTable":
      document.querySelector('[data-view="table"]')?.click();
      break;
    case "toGrid":
      document.querySelector('[data-view="grid"]')?.click();
      break;
    default:
      break;
  }
}

/* ---------------- rendering ---------------- */

function buildRoot() {
  const el = document.createElement("div");
  el.className = "tour";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "راهنمای برنامه");
  el.innerHTML = `
    <div class="tour-overlay"></div>
    <div class="tour-ring"></div>
    <div class="tour-bubble">
      <div class="tour-arrow"></div>
      <div class="tour-step-label"></div>
      <h3 class="tour-title"></h3>
      <p class="tour-text"></p>
      <div class="tour-actions">
        <button type="button" class="tour-skip">رد شدن</button>
        <div class="tour-spacer"></div>
        <button type="button" class="tour-prev">قبلی</button>
        <button type="button" class="tour-next">بعدی</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector(".tour-skip").addEventListener("click", () => finish(false));
  el.querySelector(".tour-prev").addEventListener("click", () => step(stepIndex - 1));
  el.querySelector(".tour-next").addEventListener("click", () => step(stepIndex + 1));
  return el;
}

/** Union of the bounding rects of every element matching a selector. */
function targetRect(selector) {
  const els = selector ? document.querySelectorAll(selector) : [];
  if (!els.length) return null;
  let r = null;
  els.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (!r) r = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    else {
      r.left = Math.min(r.left, rect.left);
      r.top = Math.min(r.top, rect.top);
      r.right = Math.max(r.right, rect.right);
      r.bottom = Math.max(r.bottom, rect.bottom);
    }
  });
  r.width = r.right - r.left;
  r.height = r.bottom - r.top;
  return r;
}

/**
 * Spotlight the target: a radial-gradient mask punches a transparent hole
 * in the blur/dim overlay around the element, so the crisp real element
 * shows through while everything else is blurred + dimmed. A glowing ring
 * marks the showcased element.
 */
function applyHole(rect) {
  const overlay = rootEl.querySelector(".tour-overlay");
  const ring = rootEl.querySelector(".tour-ring");
  if (!rect) {
    overlay.style.maskImage = "none";
    overlay.style.webkitMaskImage = "none";
    ring.style.display = "none";
    return;
  }
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.max(rect.width, rect.height) / 2 + 40;

  // Transparent inside the hole → overlay (and its blur) invisible there.
  const mask = `radial-gradient(circle ${Math.round(radius)}px at ${Math.round(cx)}px ${Math.round(cy)}px, transparent 68%, rgba(0,0,0,1) 100%)`;
  overlay.style.maskImage = mask;
  overlay.style.webkitMaskImage = mask;

  // Glowing ring around the showcased element.
  ring.style.display = "block";
  ring.style.top = `${rect.top - 5}px`;
  ring.style.left = `${rect.left - 5}px`;
  ring.style.width = `${rect.width + 10}px`;
  ring.style.height = `${rect.height + 10}px`;
}

function placeBubble(rect) {
  const bubble = rootEl.querySelector(".tour-bubble");
  const bubbleW = bubble.offsetWidth;
  const bubbleH = bubble.offsetHeight;
  const margin = 14;
  let top;
  let arrowPos = "bottom"; // arrow on bottom edge → bubble above target
  let arrowLeft = "50%";

  if (!rect) {
    top = Math.max(12, (window.innerHeight - bubbleH) / 2);
  } else if (rect.top - bubbleH - margin > 8) {
    top = rect.top - bubbleH - margin;
    arrowPos = "bottom";
    arrowLeft = `${Math.min(Math.max(rect.left + rect.width / 2 - 10, 18), window.innerWidth - 28)}px`;
  } else {
    top = Math.min(rect.bottom + margin, window.innerHeight - bubbleH - 12);
    arrowPos = "top";
    arrowLeft = `${Math.min(Math.max(rect.left + rect.width / 2 - 10, 18), window.innerWidth - 28)}px`;
  }

  // Safety: never push the bubble off-screen.
  top = Math.max(10, Math.min(top, window.innerHeight - bubbleH - 10));

  bubble.style.top = `${top}px`;
  bubble.style.left = `${Math.max(8, (window.innerWidth - bubbleW) / 2)}px`;
  bubble.style.right = "auto";
  bubble.dataset.arrow = arrowPos;
  bubble.querySelector(".tour-arrow").style.left = arrowLeft;
}

function spotlight(stepDef) {
  const els = stepDef.selector ? document.querySelectorAll(stepDef.selector) : [];
  const rect = targetRect(stepDef.selector);
  const needsScroll = els.length > 0 && rect && (rect.top < 80 || rect.bottom > window.innerHeight - 90);

  if (needsScroll) {
    // Hide the bubble while the target scrolls into view, then position
    // everything after the scroll settles.
    const bubble = rootEl.querySelector(".tour-bubble");
    bubble.style.opacity = "0";
    try {
      els[0].scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      if (!active || !rootEl || !rootEl.isConnected) return;
      const r = targetRect(stepDef.selector);
      applyHole(r);
      placeBubble(r);
      bubble.style.opacity = "";
    }, 320);
    return;
  }

  applyHole(rect);
  placeBubble(rect);
}

function showStep(stepDef) {
  rootEl.querySelector(".tour-title").textContent = stepDef.title;
  rootEl.querySelector(".tour-text").textContent = stepDef.text;
  rootEl.querySelector(".tour-step-label").textContent = `${toPersian(stepIndex + 1)} از ${toPersian(TOUR_STEPS.length)}`;
  const prevBtn = rootEl.querySelector(".tour-prev");
  prevBtn.style.visibility = stepIndex === 0 ? "hidden" : "visible";
  const nextBtn = rootEl.querySelector(".tour-next");
  nextBtn.textContent = stepIndex === TOUR_STEPS.length - 1 ? "تمام" : "بعدی";
}

/* ---------------- engine ---------------- */

async function step(index) {
  if (!active) return;
  if (index < 0 || index >= TOUR_STEPS.length) {
    finish(true);
    return;
  }
  stepIndex = index;
  const stepDef = TOUR_STEPS[index];

  // Move to the right tab first.
  const current = getRoute() || "calendar";
  if (stepDef.tab !== current) {
    navigate(stepDef.tab);
    await waitFor(() => getRoute() === stepDef.tab);
  }

  // Perform the click action, then wait for the target to exist.
  if (stepDef.click) await runAction(stepDef.click);
  if (stepDef.selector) {
    await waitFor(() => document.querySelector(stepDef.selector));
  }

  showStep(stepDef);
  spotlight(stepDef);
}

async function finish(completed) {
  if (!active) return;
  active = false;
  if (completed) markSeen();

  // Unblock scrolling and restore the original scroll position.
  document.body.classList.remove("tour-lock");
  if (savedScrollY > 0) {
    try {
      window.scrollTo({ top: savedScrollY, behavior: "auto" });
    } catch {
      /* ignore */
    }
  }

  // Restore the calendar view the tour switched (grid ↔ table) and return
  // the user to the tab they started from.
  if (savedView && state.settings.calendarViewType !== savedView) {
    state.set({ calendarViewType: savedView });
  }
  if (savedTab && getRoute() !== savedTab) {
    navigate(savedTab);
  }

  if (rootEl) {
    if (rootEl._cleanup) rootEl._cleanup();
    rootEl.classList.add("is-leaving");
    setTimeout(() => {
      if (rootEl && rootEl.isConnected) rootEl.remove();
      rootEl = null;
    }, 240);
  }
}

/* ---------------- public API ---------------- */

/** Start the tour from the current screen (replay from Settings). */
export async function startTour() {
  if (active) return;
  if (rootEl) return;
  active = true;
  stepIndex = 0;

  savedTab = getRoute() || "calendar";
  savedView = state.settings.calendarViewType === "table" ? "table" : "grid";
  savedScrollY = window.scrollY || 0;

  rootEl = buildRoot();

  // Block user scrolling (the tour scrolls itself) and taps outside the guide.
  document.body.classList.add("tour-lock");
  const blockWheel = (e) => {
    if (!active) return;
    if (rootEl && e.target && rootEl.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const blockTouch = (e) => {
    if (!active) return;
    if (rootEl && e.target && rootEl.contains(e.target)) return;
    e.preventDefault();
  };
  const onKey = (e) => {
    if (e.key === "Escape") finish(false);
  };
  const onResize = () => {
    if (active && rootEl && rootEl.isConnected) spotlight(TOUR_STEPS[stepIndex]);
  };

  window.addEventListener("wheel", blockWheel, { passive: false, capture: true });
  window.addEventListener("touchmove", blockTouch, { passive: false, capture: true });
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);

  rootEl._cleanup = () => {
    window.removeEventListener("wheel", blockWheel, { capture: true });
    window.removeEventListener("touchmove", blockTouch, { capture: true });
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
  };

  await step(0);

  // Reposition once images/fonts settle (e.g. roster image loads).
  setTimeout(() => {
    if (active && rootEl && rootEl.isConnected) spotlight(TOUR_STEPS[stepIndex]);
  }, 400);
}

/** One-time auto-start: called after the calendar first renders, only for
 *  users who finished onboarding and haven't seen the tour yet. */
export function maybeAutoStartTour() {
  if (active || seen()) return;
  if (!state.settings.onboardingCompleted) return;
  setTimeout(() => {
    if (active || seen()) return;
    startTour();
  }, 900);
}

/** Lets the install-prompt skip its auto-ask while the tour is running. */
export function isTourActive() {
  return active;
}
