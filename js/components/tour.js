/**
 * Guided tour — a one-time, spotlight-style walkthrough of the whole app.
 *
 * Shows a highlight ring around the element being explained plus an anchored
 * tooltip bubble (next/prev/skip). Steps can switch tabs automatically and
 * trigger small UI actions (switch month, switch view) so the user sees the
 * feature in action. Runs once per device (like onboarding); can be replayed
 * from Settings → راهنمای شروع.
 */
import { TOUR_STEPS } from "./tour-steps.js";
import { navigate, getRoute } from "../core/router.js";
import { state } from "../core/state.js";

const SEEN_KEY = "shiftkar.tourSeen.v1";

let active = false;
let stepIndex = 0;
let rootEl = null;
let savedTab = null;

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

function placeRing(rect) {
  const ring = rootEl.querySelector(".tour-ring");
  if (!rect) {
    ring.style.display = "none";
    return null;
  }
  ring.style.display = "block";
  const pad = 6;
  ring.style.top = `${rect.top - pad}px`;
  ring.style.left = `${rect.left - pad}px`;
  ring.style.width = `${rect.width + pad * 2}px`;
  ring.style.height = `${rect.height + pad * 2}px`;
  return rect;
}

function placeBubble(rect) {
  const bubble = rootEl.querySelector(".tour-bubble");
  const bubbleW = bubble.offsetWidth;
  const bubbleH = bubble.offsetHeight;
  const margin = 14;
  let top;
  let arrowPos = "bottom"; // arrow on the bottom edge → bubble above target
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

  bubble.style.top = `${top}px`;
  bubble.style.left = `${Math.max(8, (window.innerWidth - bubbleW) / 2)}px`;
  bubble.style.right = "auto";
  bubble.dataset.arrow = arrowPos;
  bubble.querySelector(".tour-arrow").style.left = arrowLeft;
}

function showStep(step) {
  rootEl.querySelector(".tour-title").textContent = step.title;
  rootEl.querySelector(".tour-text").textContent = step.text;
  rootEl.querySelector(".tour-step-label").textContent = `${toPersian(stepIndex + 1)} از ${toPersian(TOUR_STEPS.length)}`;
  const prevBtn = rootEl.querySelector(".tour-prev");
  prevBtn.style.visibility = stepIndex === 0 ? "hidden" : "visible";
  const nextBtn = rootEl.querySelector(".tour-next");
  nextBtn.textContent = stepIndex === TOUR_STEPS.length - 1 ? "تمام" : "بعدی";
}

function spotlight(step) {
  const el = step.selector ? document.querySelector(step.selector) : null;
  const rect = el ? el.getBoundingClientRect() : null;
  if (el && rect) {
    // Only scroll when the element is actually out of view (nearest — no jumps).
    const vh = window.innerHeight;
    if (rect.top < 90 || rect.bottom > vh - 100) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // Measure after the scroll settles.
    const r2 = el.getBoundingClientRect();
    placeRing(r2);
    placeBubble(r2);
  } else {
    placeRing(null);
    placeBubble(null);
  }
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

  // Return the user to the tab they started from (the calendar view itself
  // is restored automatically from state on render).
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

/**
 * Start the tour from the current screen. Pass { force: true } to replay
 * from Settings regardless of the seen flag.
 */
export async function startTour() {
  if (active) return;
  if (rootEl) return;
  active = true;
  stepIndex = 0;

  savedTab = getRoute() || "calendar";

  rootEl = buildRoot();

  const onResize = () => {
    if (active && rootEl && rootEl.isConnected) {
      const stepDef = TOUR_STEPS[stepIndex];
      spotlight(stepDef);
    }
  };
  window.addEventListener("resize", onResize);
  const onKey = (e) => {
    if (e.key === "Escape") finish(false);
  };
  document.addEventListener("keydown", onKey);
  rootEl._cleanup = () => {
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", onKey);
  };

  await step(0);

  // Reposition once images/fonts settle (e.g. roster image loads).
  setTimeout(() => {
    if (active && rootEl && rootEl.isConnected) spotlight(TOUR_STEPS[stepIndex]);
  }, 350);
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
