/**
 * Guided tour — a one-time, spotlight-style walkthrough of the whole app.
 *
 * While the tour is open the user can ONLY interact with the guide itself:
 *  - a full-screen overlay dims + blurs everything EXCEPT the showcased
 *    element(s) — an elliptical mask punches a transparent hole over the
 *    union of all matched elements, so a whole group (nav bar, group chips,
 *    theme grid) stays crisp (no DOM cloning, no fragile clip-path);
 *  - a glowing ring marks the showcased group;
 *  - taps, wheel and touch scrolling outside the tooltip are blocked;
 *  - steps auto-scroll the target into view (waiting for the scroll to
 *    settle before measuring, so the ring never lands mid-scroll) and can
 *    switch tabs, trigger small UI actions (switch month, switch view) and
 *    run live demos («برو به امروز»).
 *
 * Runs once per device (like onboarding); replayable from Settings → راهنمای شروع.
 */
import { TOUR_STEPS } from "./tour-steps.js";
import { navigate, getRoute } from "../core/router.js";
import { state } from "../core/state.js";
import { icon } from "./icons.js";
import { setTodayChipHold } from "../pages/calendar.js";

const SEEN_KEY = "shiftkar.tourSeen.v1";

let active = false;
let stepIndex = 0;
let rootEl = null;
let savedTab = null;
let savedView = null;
let savedScrollY = 0;
let passThroughActive = false;
/** Monotonic token for step transitions — invalidates stale async step()
 *  invocations (see step() below). */
let stepToken = 0;

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
    case "prevMonth":
      document.querySelector('.cal-nav-btn[data-action="prev"]')?.click();
      break;
    case "toTable":
      document.querySelector('[data-view="table"]')?.click();
      break;
    case "toGrid":
      document.querySelector('[data-view="grid"]')?.click();
      break;
    case "openDay":
      document
        .querySelector(
          ".cal-cell.is-today, tr.is-today, .cal-cell[data-datekey], tr[data-datekey]",
        )
        ?.click();
      break;
    case "openNotes":
      document.querySelector('[data-action="notes"]')?.click();
      break;
    default:
      break;
  }
}

/** Close any bottom sheet / fullscreen table left open — the tour opens
 *  them while teaching (day detail, all-notes), and they must not linger
 *  blurred under later steps. */
function closeOverlays() {
  const sheetClose = document.querySelector(".sheet-overlay .sheet-close");
  if (sheetClose) sheetClose.click();
  const tfClose = document.querySelector('.table-fullscreen [data-tf="close"]');
  if (tfClose) tfClose.click();
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
    <div class="tour-swipe-nav" hidden>
      <button type="button" class="tour-swipe-btn" data-swipe="prev" aria-label="ماه قبل">${icon("chevronRight")}</button>
      <button type="button" class="tour-swipe-btn" data-swipe="next" aria-label="ماه بعد">${icon("chevronLeft")}</button>
    </div>
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
  el.querySelector('[data-swipe="prev"]').addEventListener("click", () => runAction("prevMonth"));
  el.querySelector('[data-swipe="next"]').addEventListener("click", () => runAction("nextMonth"));
  return el;
}

/** Union of the bounding rects of every element matching a selector.
 *  Hidden elements (display:none / zero-size) are skipped so they can never
 *  inflate the union across the whole screen (e.g. the desktop view-toggle
 *  group on narrow screens). */
function targetRect(selector) {
  const els = selector ? document.querySelectorAll(selector) : [];
  if (!els.length) return null;
  let r = null;
  els.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return; // hidden — ignore
    if (!r) r = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    else {
      r.left = Math.min(r.left, rect.left);
      r.top = Math.min(r.top, rect.top);
      r.right = Math.max(r.right, rect.right);
      r.bottom = Math.max(r.bottom, rect.bottom);
    }
  });
  if (!r) return null;
  r.width = r.right - r.left;
  r.height = r.bottom - r.top;
  return r;
}

/** Resolve once the target has stopped moving (smooth scroll finished), so
 *  measurements happen at the final resting position. */
function waitForScrollSettle(selector, timeout = 1500) {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastTop = null;
    let stable = 0;
    const poll = () => {
      const r = targetRect(selector);
      const top = r ? Math.round(r.top) : null;
      if (top !== null && top === lastTop) stable += 1;
      else if (top !== null) {
        stable = 0;
        lastTop = top;
      }
      if (Date.now() - start > timeout) return resolve();
      if (top !== null && stable >= 4) return resolve();
      setTimeout(poll, 60);
    };
    poll();
  });
}

/** True while `token` is still the latest step transition — a newer «بعدی» /
 *  «قبلی» tap, or a finished tour, invalidates older ones. */
function stillCurrent(token) {
  return active && rootEl && rootEl.isConnected && token === stepToken;
}

/* Focus levels: some steps only point at a control and the surrounding
   content is the real subject (tabs, group chips, theme grid, view switch,
   systems…) — blurring it would hide exactly what the step is about. Those
   use "soft": NO blur and a whisper of dim, so the whole page stays fully
   readable and the ring marks the target (the crisp hole still lets it
   pop). Control-only steps use "strong": everything outside the target is
   genuinely blurred + dimmed. */
const FOCUS = {
  soft: { blur: 0, dim: 0.1 },
  strong: { blur: 3.5, dim: 0.38 },
  /* Pass-through steps (the swipe lesson) need the app fully readable AND
     interactive — no blur, no dim, only the bubble + swipe arrows guide. */
  clear: { blur: 0, dim: 0 },
};

function applyFocus(stepDef) {
  const f = FOCUS[stepDef.focus] || FOCUS.strong;
  const overlay = rootEl.querySelector(".tour-overlay");
  const blur = `blur(${f.blur}px)`;
  overlay.style.webkitBackdropFilter = blur;
  overlay.style.backdropFilter = blur;
  overlay.style.background = `rgba(8, 11, 24, ${f.dim})`;
}

/**
 * Spotlight the target(s): an SVG mask punches a crisp rounded-rectangle
 * hole in the dim/blur overlay around the union of every matched element, so
 * the real elements show through (ALL of them — group chips, the theme
 * grid, the nav bar) while everything else is dimmed + blurred. The mask is
 * rebuilt from actual viewport-relative coordinates, so the hole matches the
 * showcased group edge-to-edge — an ellipse drifted off wide/short groups
 * (bottom nav, chips…) and left a torn blur edge. A glowing ring marks the
 * whole showcased group.
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

  // Rounded-rectangle hole slightly larger than the union rect. The SVG is
  // sized to the current viewport, so its user-space coordinates map 1:1 to
  // the overlay's fixed inset-0 box; white = dim/blur kept, black = hole.
  const pad = 6;
  const x = Math.max(0, Math.round(rect.left - pad));
  const y = Math.max(0, Math.round(rect.top - pad));
  const w = Math.round(rect.width + pad * 2);
  const h = Math.round(rect.height + pad * 2);
  const r = Math.min(22, Math.round(Math.min(w, h) / 2));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${window.innerWidth}" height="${window.innerHeight}">` +
    `<defs><mask id="shk-hole" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">` +
    `<rect width="100%" height="100%" fill="white"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="black"/>` +
    `</mask></defs>` +
    `<rect width="100%" height="100%" fill="white" mask="url(#shk-hole)"/>` +
    `</svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  overlay.style.maskImage = url;
  overlay.style.webkitMaskImage = url;
  overlay.style.maskSize = "100% 100%";
  overlay.style.webkitMaskSize = "100% 100%";
  overlay.style.maskRepeat = "no-repeat";
  overlay.style.webkitMaskRepeat = "no-repeat";

  // Glowing ring around the showcased group — skipped when the target
  // covers most of the screen (whole calendar/sheet/grid), where the crisp
  // hole itself is the highlight and a huge frame reads as a glitch.
  const coversScreen =
    rect.width * rect.height > window.innerWidth * window.innerHeight * 0.4;
  ring.style.display = coversScreen ? "none" : "block";
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
    // No target (or it vanished after a demo): center the bubble WITHOUT an
    // arrow — a dangling pointer at nothing looks broken.
    top = Math.max(12, (window.innerHeight - bubbleH) / 2);
    arrowPos = "none";
    arrowLeft = "50%";
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

async function spotlight(stepDef) {
  const thisStep = stepIndex;
  applyFocus(stepDef);
  // Steps with passThrough (the swipe lesson) let touches reach the app so
  // the gesture actually works; the bubble and swipe arrows stay clickable.
  passThroughActive = !!stepDef.passThrough;
  rootEl.querySelector(".tour-overlay").style.pointerEvents = passThroughActive ? "none" : "auto";
  const swipeNav = rootEl.querySelector(".tour-swipe-nav");
  if (swipeNav) swipeNav.hidden = !stepDef.swipeArrows;

  const els = stepDef.selector ? document.querySelectorAll(stepDef.selector) : [];
  const rect = targetRect(stepDef.selector);
  const needsScroll = els.length > 0 && rect && (rect.top < 80 || rect.bottom > window.innerHeight - 90);

  if (needsScroll) {
    // Hide the bubble while the target scrolls into view, then wait for the
    // scroll to SETTLE before measuring — measuring mid-smooth-scroll left
    // the ring stuck at a wrong spot (e.g. floating over the bottom nav).
    const bubble = rootEl.querySelector(".tour-bubble");
    bubble.style.opacity = "0";
    try {
      els[0].scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      /* ignore */
    }
    await waitForScrollSettle(stepDef.selector);
    if (!active || !rootEl || !rootEl.isConnected) return;
    // A newer step may have started while the scroll settled — don't let a
    // stale spotlight overwrite the new step's ring/bubble.
    if (stepIndex !== thisStep) return;
    const r = targetRect(stepDef.selector);
    applyHole(r);
    placeBubble(r);
    bubble.style.opacity = "";
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
  // Guard against overlapping transitions: if the user taps «بعدی» while the
  // previous step is still settling (tab switch, scroll, sheet animation),
  // two step() invocations can race — the slower one used to overwrite the
  // new step's title/text with the old step's content while the counter had
  // already advanced. Every invocation gets a token; any that is no longer
  // current bails before touching the UI.
  const token = ++stepToken;
  stepIndex = index;
  let stepDef = TOUR_STEPS[index];

  // Close any sheet/fullscreen left open by a previous step (sheet steps
  // keep theirs open — the sheet is the subject of the step).
  if (!stepDef.sheetStep) closeOverlays();

  // Move to the right tab first.
  const current = getRoute() || "calendar";
  if (stepDef.tab !== current) {
    navigate(stepDef.tab);
    await waitFor(() => getRoute() === stepDef.tab);
    if (!stillCurrent(token)) return;
  }

  // Install step: once the app is installed, pointing at the CTA is
  // meaningless — swap in the "already installed" copy and skip the
  // spotlight (must run after the settings page rendered).
  if (stepDef.installedText) {
    const btn = document.querySelector("#install-app-btn");
    if (btn && /نصب شده/.test(btn.textContent)) {
      stepDef = {
        ...stepDef,
        selector: null,
        focus: "soft",
        title: stepDef.installedTitle || stepDef.title,
        text: stepDef.installedText,
      };
    }
  }

  // click actions REVEAL the target (switch month / view) and run before
  // the spotlight; demo actions run after it, as a live demonstration.
  if (stepDef.click) await runAction(stepDef.click);
  if (stepDef.selector) {
    await waitFor(() => document.querySelector(stepDef.selector));
    if (!stillCurrent(token)) return;
    // Sheet steps animate in — wait for the motion to settle so the
    // spotlight lands on the final position.
    if (stepDef.settle) await waitForScrollSettle(stepDef.selector);
    if (!stillCurrent(token)) return;
  }
  // The tour froze the chip when it started; re-asserting is a no-op but
  // keeps the step flag meaningful. The chip keeps whatever state it is in
  // (expanded label or folded icon) and the spotlight highlights exactly
  // that — it is never forced to expand or collapse mid-guide.
  if (stepDef.holdTodayChip) {
    setTodayChipHold(true);
  }

  showStep(stepDef);
  await spotlight(stepDef);
  if (!stillCurrent(token)) return;

  // Demo (e.g. «برو به امروز»): perform the action a moment later. The
  // target usually disappears (the chip only exists off the current month),
  // so the ring and the arrow fade at that moment — the bubble stays where
  // it is instead of jumping to a recentred spot with a dangling pointer.
  if (stepDef.demo) {
    const demoIndex = stepIndex;
    setTimeout(() => {
      if (!active || !rootEl || !rootEl.isConnected) return;
      if (stepIndex !== demoIndex) return;
      runAction(stepDef.demo);
      const ring = rootEl.querySelector(".tour-ring");
      ring.style.display = "none";
      const bubble = rootEl.querySelector(".tour-bubble");
      bubble.dataset.arrow = "none";
    }, 1000);
  }
}

async function finish(completed) {
  if (!active) return;
  active = false;
  if (completed) markSeen();

  closeOverlays();
  setTodayChipHold(false);

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

  // Pause the app for the duration of the guide — the «برو به امروز» chip is
  // frozen in its current state so it can't collapse or re-expand under the
  // spotlight; finish() unfreezes it and normal behavior resumes.
  setTodayChipHold(true);

  savedTab = getRoute() || "calendar";
  savedView = state.settings.calendarViewType === "table" ? "table" : "grid";
  savedScrollY = window.scrollY || 0;

  rootEl = buildRoot();

  // Block user scrolling (the tour scrolls itself) and taps outside the guide.
  document.body.classList.add("tour-lock");
  const blockWheel = (e) => {
    if (!active) return;
    if (passThroughActive) return;
    if (rootEl && e.target && rootEl.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const blockTouch = (e) => {
    if (!active) return;
    if (passThroughActive) return;
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
