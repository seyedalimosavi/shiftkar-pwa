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
import { closeSheetQuietly } from "./bottom-sheet.js";
import { setTodayChipHold, closeTableFullscreenQuietly } from "../pages/calendar.js";

const SEEN_KEY = "shiftkar.tourSeen.v1";

let active = false;
let stepIndex = 0;
let rootEl = null;
let savedTab = null;
let savedView = null;
let savedScrollY = 0;

let passThroughActive = false;
/** When false (during step transition), بعدی/قبلی buttons are disabled
 *  and grayed out so the user can't skip ahead before the spotlight
 *  has been placed. Set to true once the ring + bubble are positioned. */
let stepReady = false;
/** Monotonic token for step transitions — invalidates stale async step()
 *  invocations (see step() below). */
let stepToken = 0;
/** Cleanup for auto-advance subscriber set up during swipe steps. */
let autoAdvanceCleanup = null;
/** Pending auto-advance timeout ID — cancelled when user taps بعدی/قبلی
 *  so a stale timeout can't re-run a step that already advanced. */
let autoAdvanceTimer = null;

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

/** True while `token` is still the latest step transition — a newer «بعدی» /
 *  «قبلی» tap, or a finished tour, invalidates older ones. */
function stillCurrent(token) {
  return active && rootEl && rootEl.isConnected && token === stepToken;
}

/** Check if the table view is already active — avoids toggling back to grid
 *  when going назад from a table-view step. */
function isTableActive() {
  return state.settings.calendarViewType === "table";
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
 *  blurred under later steps. Closed WITHOUT the history.back() their close
 *  buttons normally trigger (consumeBackEntry): the tour navigates to the
 *  next tab right after, and a pending back() would pop the freshly-
 *  navigated history entry — the app would bounce back to the previous tab
 *  while the bubble had already advanced (the page behind the guide stopped
 *  following the steps). */
function closeOverlays() {
  closeSheetQuietly();
  closeTableFullscreenQuietly();
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
  el.querySelector(".tour-prev").addEventListener("click", () => { if (stepReady) step(stepIndex - 1); });
  el.querySelector(".tour-next").addEventListener("click", () => { if (stepReady) step(stepIndex + 1); });
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

/** True when two rects occupy (essentially) the same viewport position —
 *  used to detect that layout has fully settled (scroll finished, sheet
 *  animation done, chip collapsed…) before drawing the spotlight. */
function rectsEqual(a, b) {
  return (
    a &&
    b &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.right) === Math.round(b.right) &&
    Math.round(a.bottom) === Math.round(b.bottom)
  );
}

/** Resolve with the target's rect once it has stopped moving — measured per
 *  ANIMATION FRAME and compared on all four edges. Frame-accurate, unlike
 *  timer polling: a smooth scroll or sheet slide changes the rect every
 *  frame, so the counter only reaches `stableFrames` after real stillness.
 *  A target that never appears resolves null quickly (no 4s hang). */
function waitForRectStable(selector, timeout = 1800) {
  return new Promise((resolve) => {
    const start = performance.now();
    let prev = null;
    let stable = 0;
    let nullFrames = 0;
    const tick = () => {
      const r = targetRect(selector);
      if (r && rectsEqual(r, prev)) stable += 1;
      else stable = 0;
      prev = r;
      // Target present and motionless for several frames → done.
      if (r && stable >= 4) return resolve(r);
      // Target absent for ~8 frames → it is really not there; don't hang.
      if (!r && ++nullFrames >= 8) return resolve(null);
      if (performance.now() - start > timeout) return resolve(r);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** True when the element (or an ancestor) is fixed-positioned — sheets,
 *  the bottom nav, the fullscreen table. scrollIntoView is meaningless (and
 *  destabilising) for those; they are always fully on-screen by design. */
function isFixed(el) {
  let n = el;
  while (n && n !== document.body) {
    if (getComputedStyle(n).position === "fixed") return true;
    n = n.parentElement;
  }
  return false;
}

/** Height of the fixed bottom nav (the effective bottom edge of the
 *  visible page area) — 0 when the nav is absent. */
function bottomNavHeight() {
  const nav = document.getElementById("bottom-nav");
  if (!nav || !nav.isConnected) return 0;
  const style = getComputedStyle(nav);
  return style.display === "none" || style.visibility === "hidden" ? 0 : nav.offsetHeight;
}

/** Keep a rect fully on-screen — a target that pokes past the viewport edge
 *  (the folded «امروز» chip at the screen corner) gets a ring/hole that is
 *  clamped to the viewport instead of being cut off. */
function clampRect(r, margin = 8) {
  const left = Math.max(margin, r.left);
  const top = Math.max(margin, r.top);
  const right = Math.min(window.innerWidth - margin, r.right);
  const bottom = Math.min(window.innerHeight - margin, r.bottom);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
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
    ring.style.opacity = "0";
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
  // Opacity-only so the 180ms CSS transition fades it in/out; toggling
  // display:none breaks transitions on Safari and hides the ring until
  // after a layout tick.
  const coversScreen =
    rect.width * rect.height > window.innerWidth * window.innerHeight * 0.4;
  ring.style.opacity = coversScreen ? "0" : "1";
  ring.style.top = `${rect.top - 5}px`;
  ring.style.left = `${rect.left - 5}px`;
  ring.style.width = `${rect.width + 10}px`;
  ring.style.height = `${rect.height + 10}px`;
}

function placeBubble(rect) {
  const bubble = rootEl.querySelector(".tour-bubble");
  const bubbleW = bubble.offsetWidth;
  const bubbleH = bubble.offsetHeight;
  /* The ring is drawn ~5px outside the rect plus a glow — the bubble must
   * clear that, so the gap is measured from the ring's outer edge. */
  const gap = 16;
  const safeTop = 12;
  const safeBottom = 12;
  let top;
  let arrowPos = "bottom"; // arrow on bottom edge → bubble above target

  if (!rect) {
    // No target (or it vanished after a demo): center the bubble WITHOUT an
    // arrow — a dangling pointer at nothing looks broken.
    top = Math.max(safeTop, (window.innerHeight - bubbleH) / 2);
    arrowPos = "none";
  } else {
    const spaceAbove = rect.top - gap;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const fitsAbove = spaceAbove >= Math.min(bubbleH + safeTop, 200);
    const fitsBelow = spaceBelow >= Math.min(bubbleH + safeBottom, 220);
    if (fitsAbove && (!fitsBelow || spaceAbove >= spaceBelow)) {
      // Above the target (arrow at the bubble's bottom edge).
      top = Math.max(safeTop, rect.top - gap - bubbleH);
      arrowPos = "bottom";
    } else if (fitsBelow) {
      // Below the target (arrow at the bubble's top edge).
      top = Math.min(rect.bottom + gap, window.innerHeight - bubbleH - safeBottom);
      arrowPos = "top";
    } else {
      // Neither side fits the whole bubble: overlap the LARGER side and
      // drop the arrow — a pointer buried under its own bubble looks broken.
      if (spaceBelow >= spaceAbove) {
        top = window.innerHeight - bubbleH - safeBottom;
      } else {
        top = Math.max(safeTop, rect.top - gap - bubbleH);
      }
      arrowPos = "none";
    }
  }

  // Safety: never push the bubble off-screen.
  top = Math.max(safeTop, Math.min(top, window.innerHeight - bubbleH - safeBottom));

  // Arrow points at the target's horizontal center (clamped inside the bubble).
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;

  bubble.style.top = `${top}px`;
  bubble.style.left = `${Math.max(8, (window.innerWidth - bubbleW) / 2)}px`;
  bubble.style.right = "auto";
  bubble.dataset.arrow = arrowPos;
  bubble.querySelector(".tour-arrow").style.left = `${Math.min(
    Math.max(cx - 10, 18),
    window.innerWidth - 28,
  )}px`;
}

async function spotlight(stepDef) {
  const thisStep = stepIndex;
  const bubble = rootEl.querySelector(".tour-bubble");
  // A step that was interrupted while its target scrolled into view leaves
  // the bubble at opacity 0 — always restore it so the current step's
  // bubble can never stay invisible after a rapid قبلی/بعدی tap.
  bubble.style.opacity = "";
  applyFocus(stepDef);
  // Steps with passThrough (the swipe lesson) let touches reach the app so
  // the gesture actually works; the bubble and swipe arrows stay clickable.
  passThroughActive = !!stepDef.passThrough;
  rootEl.querySelector(".tour-overlay").style.pointerEvents = passThroughActive ? "none" : "auto";
  const swipeNav = rootEl.querySelector(".tour-swipe-nav");
  if (swipeNav) swipeNav.hidden = !stepDef.swipeArrows;

  // Auto-advance: when a passThrough step has autoAdvance (the swipe
  // lesson), watch for a month change and advance automatically once the
  // user swipes — no need to tap بعدی.
  if (autoAdvanceCleanup) { autoAdvanceCleanup(); autoAdvanceCleanup = null; }
  if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
  if (stepDef.autoAdvance && passThroughActive) {
    const monthBefore = `${state.settings.viewYear}-${state.settings.viewMonth}`;
    const unsub = state.subscribe(() => {
      if (!active || stepIndex !== thisStep) return;
      const monthNow = `${state.settings.viewYear}-${state.settings.viewMonth}`;
      if (monthNow !== monthBefore) {
        // Month changed — clean up and advance after a brief pause so the
        // user can see the new month render before the bubble moves on.
        if (autoAdvanceCleanup) { autoAdvanceCleanup(); autoAdvanceCleanup = null; }
        autoAdvanceTimer = setTimeout(() => {
          autoAdvanceTimer = null;
          if (active && stepIndex === thisStep) step(thisStep + 1);
        }, 600);
      }
    });
    autoAdvanceCleanup = unsub;
  }

  const els = stepDef.selector ? document.querySelectorAll(stepDef.selector) : [];
  const firstRect = targetRect(stepDef.selector);

  // Scroll the page ONLY when the target is genuinely not fully visible in
  // the effective viewport (below the top edge, or hidden behind the fixed
  // bottom nav / under the viewport bottom) AND the target actually lives
  // in the scrollable page. Fixed elements (sheets, bottom nav, fullscreen
  // table) are always fully on-screen by design — scrolling them used to
  // destabilise the measurement and misplace the ring.
  if (
    firstRect &&
    els.length &&
    !isFixed(els[0]) &&
    (firstRect.top < 8 ||
      firstRect.bottom > window.innerHeight - bottomNavHeight() - 8)
  ) {
    bubble.style.opacity = "0";
    try {
      els[0].scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }

  // Wait for the layout to be truly still (scroll finished, sheet animation
  // done, chip collapsed), then measure the FINAL resting rect.
  const rect = await waitForRectStable(stepDef.selector, stepDef.settle ? 2200 : 1600);
  if (!active || !rootEl || !rootEl.isConnected) return;
  if (stepIndex !== thisStep) {
    bubble.style.opacity = "";
    return;
  }

  applyHole(rect ? clampRect(rect) : null);
  placeBubble(rect ? clampRect(rect) : null);
  bubble.style.opacity = "";
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

/** Enable/disable بعدی/قبلی buttons while the spotlight is being placed.
 *  Disabled buttons get a "is-loading" class that grays them out and
 *  blocks clicks, so the user can't skip ahead before seeing the step. */
function setButtonsReady(ready) {
  if (!rootEl || !rootEl.isConnected) return;
  const prevBtn = rootEl.querySelector(".tour-prev");
  const nextBtn = rootEl.querySelector(".tour-next");
  // Use only CSS class (no disabled attr) to avoid default browser
  // focus/press animations. The click handlers check stepReady directly.
  if (prevBtn) prevBtn.classList.toggle("is-loading", !ready);
  if (nextBtn) nextBtn.classList.toggle("is-loading", !ready);
}

/* ---------------- engine ---------------- */

/** Install step: once the app is installed, pointing at the CTA is
 *  meaningless — returns the "already installed" variant (no spotlight,
 *  different copy), or the original step while the CTA still applies. */
function installedVariant(def) {
  if (!def.installedText) return def;
  const btn = document.querySelector("#install-app-btn");
  if (btn && /نصب شده/.test(btn.textContent)) {
    return {
      ...def,
      selector: null,
      focus: "soft",
      title: def.installedTitle || def.title,
      text: def.installedText,
    };
  }
  return def;
}

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
  // Clean up any auto-advance subscriber from a previous pass-through step.
  if (autoAdvanceCleanup) { autoAdvanceCleanup(); autoAdvanceCleanup = null; }
  const baseDef = TOUR_STEPS[index];

  // Close any sheet/fullscreen left open by a previous step (sheet steps
  // keep theirs open — the sheet is the subject of the step).
  if (!baseDef.sheetStep) closeOverlays();

  // Update the bubble IMMEDIATELY — counter, title, text and the button
  // states follow the tap now, not after the navigation/settling below.
  // Showing them late made the bubble lag the page: pressing «قبلی» moved
  // the app to the previous tab while the counter stayed put (or vice
  // versa) until every wait below had finished, and rapid taps could leave
  // it stuck on the previous step's content.
  let stepDef = installedVariant(baseDef);
  showStep(stepDef);

  // Move to the right tab first. If the route doesn't land where we asked,
  // retry once — a stale history entry used to let the bubble advance while
  // the page stayed behind.
  const current = getRoute() || "calendar";
  if (baseDef.tab !== current) {
    navigate(baseDef.tab);
    let landed = await waitFor(() => getRoute() === baseDef.tab);
    if (!landed) {
      navigate(baseDef.tab);
      landed = await waitFor(() => getRoute() === baseDef.tab);
    }
    if (!stillCurrent(token)) return;
    // The install step's copy depends on the settings page having rendered —
    // re-resolve it now that the tab has loaded and refresh the bubble if
    // the swap differs from what it already shows.
    if (baseDef.installedText) {
      const swapped = installedVariant(baseDef);
      if (swapped !== stepDef) {
        stepDef = swapped;
        showStep(stepDef);
      }
    }
  }

  // click actions REVEAL the target (switch month / view) and run before
  // the spotlight; demo actions run after it, as a live demonstration.
  // ensureVisibleTable: only toggle to table if not already there — going
  // back from a table-view step must not toggle back to grid.
  if (stepDef.click) {
    if (stepDef.click === "toTable" && stepDef.ensureVisibleTable && isTableActive()) {
      /* already table — skip the toggle */
    } else {
      await runAction(stepDef.click);
    }
  }
  if (stepDef.selector) {
    // Steps with ensureVisible get a short first wait: if their subject was
    // consumed by an earlier demo (the «برو به امروز» chip after its demo,
    // an open sheet after it was closed), reveal it again right away so the
    // spotlight has something real to highlight instead of hanging 4s and
    // then showing a centered bubble pointing at nothing (this is what
    // happens when the user goes BACK to those steps).
    const firstWait = stepDef.ensureVisible ? 300 : 4000;
    let target = await waitFor(() => document.querySelector(stepDef.selector), firstWait);
    if (!target && stepDef.ensureVisible) {
      await runAction(stepDef.ensureVisible);
      target = await waitFor(() => document.querySelector(stepDef.selector));
    }
    if (!stillCurrent(token)) return;
    // Sheet/animation settling is handled by the frame-stable measurement
    // inside spotlight() — no separate wait needed here.
  }
  // The tour froze the chip when it started; re-asserting is a no-op but
  // keeps the step flag meaningful. The chip keeps whatever state it is in
  // (expanded label or folded icon) and the spotlight highlights exactly
  // that — it is never forced to expand or collapse mid-guide.
  if (stepDef.holdTodayChip) {
    setTodayChipHold(true);
  }

  // Disable بعدی/قبلی until the spotlight is placed — ensures the user
  // actually sees the current step before skipping ahead.
  stepReady = false;
  setButtonsReady(false);

  await spotlight(stepDef);
  if (!stillCurrent(token)) return;

  // Spotlight is placed — enable navigation buttons.
  stepReady = true;
  setButtonsReady(true);

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
      ring.style.opacity = "0";
      const bubble = rootEl.querySelector(".tour-bubble");
      bubble.dataset.arrow = "none";
    }, 1000);
  }
}

async function finish(completed) {
  if (!active) return;
  active = false;
  // Mark as seen for BOTH completion AND skip — once the user has
  // interacted with the guide (even if they skipped it), don't force
  // it to reappear on next page refresh. They can always replay
  // from Settings → راهنمای شروع.
  markSeen();

  if (autoAdvanceCleanup) { autoAdvanceCleanup(); autoAdvanceCleanup = null; }
  if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
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

  // Restore the calendar view to what the user had before the tour.
  // Steps 12-13 switch to table view to demonstrate the feature; this
  // ensures the user ends up with THEIR preferred view regardless.
  if (savedView != null) {
    state.set({ calendarViewType: savedView });
    savedView = null;
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

  // Force calendar grid view for the tour — table view hides the calendar
  // cells that several steps want to spotlight (day cells, notes button).
  // The tour's step 11 (view toggle) teaches the table view exists; the
  // user switches back to their preferred view after the tour ends.
  if (savedView === "table") {
    state.set({ calendarViewType: "grid" });
  }

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
    // Only re-spotlight a FULLY-placed step — during a transition the
    // step() engine is mid-measurement and a parallel spotlight() here
    // would draw the ring from a half-settled rect.
    if (active && stepReady && rootEl && rootEl.isConnected) spotlight(TOUR_STEPS[stepIndex]);
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

  // Reposition once images/fonts settle (e.g. roster image loads). Guarded
  // by stepReady so it never races an in-flight step transition.
  setTimeout(() => {
    if (active && stepReady && rootEl && rootEl.isConnected) spotlight(TOUR_STEPS[stepIndex]);
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
