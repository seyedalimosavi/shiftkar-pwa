/**
 * Calendar page — the primary screen.
 * Jalali calendar: تقویم (grid) or جدولی (table) view, compact today banner,
 * group filter, notes, swipe navigation, fullscreen table mode.
 */
import { state } from "../core/state.js";
import {
  JALALI_MONTHS,
  WEEKDAYS,
  jalaaliMonthLength,
  jalaaliWeekday,
  todayJalaali,
  makeDateKey,
  formatJalali,
  formatWeekday,
  toPersianDigits,
} from "../domain/jalali.js";
import { calculateShift } from "../domain/shift-calculator.js";
import { getHoliday } from "../domain/holidays.js";
import { GROUPS, GROUP_FILTERS, SHIFT_TYPES } from "../domain/models.js";
import { getNotesForMonth } from "../core/storage.js";
import { openDayDetail } from "../components/day-detail.js";
import { openMonthPicker } from "../components/month-picker.js";
import { openAllNotes, noteDotMarkup, escapeHtml, NOTE_TABLE_CLAMP } from "../components/notes.js";
import { shiftBadge, shiftCodeBadge, miniGroupBadge } from "../components/shift-badge.js";
import { icon } from "../components/icons.js";
import { registerBackHandler, consumeBackEntry, lockBodyScroll, unlockBodyScroll } from "../components/bottom-sheet.js";
import { maybeAutoPromptInstall } from "../components/install-prompt.js";
import { maybeAutoStartTour } from "../components/tour.js";

let container = null;
let unsubscribe = null;
let notesCache = new Map();
let lastLoadedMonth = null;
let lastLoadedNotesVersion = -1;
let windowListenerAttached = false;
let keyHandler = null;

/* «برو به امروز» chip auto-collapse. The chip collapses ONCE per
   away-session: leave the current month → it shows the «امروز» label for a
   moment, then shrinks to a small circular icon and STAYS minimized while
   browsing other months. Returning to the current month removes it and
   resets the session, so the next departure plays the same show-then-
   collapse (faster the second time onward).

   Important: `todayChipSessionCollapsed` only flips when the collapse
   ACTUALLY fires. draw() re-renders often (notes load, filter changes) and
   if we flagged the session at schedule-time those quick re-renders would
   mount the chip already-minimized — the label would never really show. */
let todayChipTimer = null;
let todayChipSessionStarted = false;
let todayChipSessionCollapsed = false;
let offCurrentMonthCount = 0;

export function renderCalendar(el) {
  container = el;
  if (!unsubscribe) {
    unsubscribe = state.subscribe(() => {
      if (container && container.isConnected) draw();
    });
  }
  if (!windowListenerAttached) {
    windowListenerAttached = true;
    window.addEventListener("shiftkar:open-day", (e) => {
      if (e.detail && e.detail.dateKey) openDayDetail(e.detail.dateKey, e.detail.opts || {});
    });
  }
  draw();
  // One-time install ask — fires when the calendar is first reached, which
  // is after onboarding OR on any later visit. Internal flag makes it once-ever.
  maybeAutoPromptInstall();
  // One-time guided tour — only after onboarding is complete and only once.
  maybeAutoStartTour();
}

function currentView() {
  return state.settings.calendarViewType === "table" ? "table" : "grid";
}

function draw() {
  const s = state.settings;
  let jy = Number(s.viewYear) || 1405;
  let jm = Number(s.viewMonth) || 5;
  if (jy < 1300 || jy > 1500) jy = 1405;
  if (jm < 1 || jm > 12) jm = 5;

  const today = todayJalaali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);
  const isCurrentMonth = jy === today.jy && jm === today.jm;
  const view = currentView();

  // Back on the current month → the «امروز» chip disappears; the next time
  // the user leaves it gets to show its label once again before collapsing.
  if (isCurrentMonth) {
    todayChipSessionStarted = false;
    todayChipSessionCollapsed = false;
  }

  container.innerHTML = `
    <div class="cal-wrap">
      ${todayBannerHtml(s, today, todayKey)}

      <div class="cal-nav-row">
        <div class="cal-nav-start">
          <button type="button" class="icon-btn cal-nav-btn" data-action="prev" aria-label="ماه قبل">${icon("chevronRight")}</button>
          <button type="button" class="icon-btn cal-notes-btn" data-action="notes" aria-label="همه یادداشت‌ها">${icon("note")}</button>
        </div>
        <button type="button" class="cal-title-btn" data-action="picker" aria-label="انتخاب ماه و سال">
          <span class="cal-title">${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}</span>
          <span class="cal-title-caret">${icon("chevronDown")}</span>
        </button>
        <div class="cal-nav-end">
          <div class="view-toggle view-toggle-nav" role="group" aria-label="نمای تقویم">
            <button type="button" class="${view === "grid" ? "is-active" : ""}" data-view="grid" aria-label="نمای تقویم">${icon("grid")}</button>
            <button type="button" class="${view === "table" ? "is-active" : ""}" data-view="table" aria-label="نمای جدولی">${icon("list")}</button>
          </div>
          <button type="button" class="icon-btn view-single-toggle" data-toggle-view
            aria-label="${view === "grid" ? "تغییر به نمای جدولی" : "تغییر به نمای تقویم"}">
            ${icon(view === "grid" ? "list" : "grid")}
          </button>
          <button type="button" class="icon-btn cal-nav-btn" data-action="next" aria-label="ماه بعد">${icon("chevronLeft")}</button>
        </div>
      </div>

      <div class="cal-actions">
        <div class="group-filter" role="group" aria-label="فیلتر گروه">
          ${GROUP_FILTERS.map(
            (g) => `
            <button type="button" class="chip ${g === "ALL" ? "chip-all" : "chip-letter"} ${s.filterGroup === g ? "is-active" : ""}" data-filter="${g}" aria-label="${g === "ALL" ? "نمایش همه گروه‌ها" : `گروه ${g}`}">${g === "ALL" ? "همه" : g}</button>`,
          ).join("")}
        </div>
        ${view === "table" ? `<button type="button" class="icon-btn" data-action="fullscreen" aria-label="جدول تمام‌صفحه">${icon("expand")}</button>` : ""}
        ${isCurrentMonth ? "" : todayChipHtml({ collapsed: view === "table" || todayChipSessionCollapsed })}
      </div>

      ${view === "grid" && s.filterGroup === "ALL" ? legendHtml() : ""}

      <section class="cal-body" aria-label="تقویم ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}">
        ${view === "grid" ? gridHtml(jy, jm, s, todayKey) : tableHtml(jy, jm, s, todayKey)}
      </section>
    </div>`;

  wireEvents(s);
  loadNotes(jy, jm);
  // Table view keeps the chip permanently minimized so it never disturbs
  // the rows; the grid view follows the once-per-session collapse.
  armTodayChip(container, { alwaysCollapsed: view === "table" });
}

/* ---------------- "go to today" inline chip ---------------- */
/* Sits in the actions row (next to the fullscreen toggle) so it never
   covers calendar content. Only rendered off the current month — on the
   current month there is nowhere to go, so it disappears. */
function todayChipHtml({ collapsed = false } = {}) {
  return `
    <button type="button" class="today-chip ${collapsed ? "is-collapsed" : ""}" data-action="today" title="برو به امروز" aria-label="رفتن به امروز">
      ${icon("calendar")}<span class="today-chip-label">امروز</span>
    </button>`;
}

/**
 * The «برو به امروز» chip collapses ONCE per away-session: when the user
 * first leaves the current month it mounts EXPANDED (icon + «امروز» label),
 * then smoothly collapses to a small circular icon (padding/gap/label-width
 * transitions in CSS) and STAYS collapsed while browsing other months.
 * Returning to the current month removes it and resets the session, so the
 * next departure shows the label once again — and collapses faster (the
 * first-ever departure holds it longest). In the table view it is always
 * minimized so it never disturbs the rows. Hovering re-expands it on
 * desktop (grid view only). Each draw clears the previous timer so rapid
 * month-switching can never stack animations.
 */
function armTodayChip(root, { firstHold = 2400, repeatHold = 900, alwaysCollapsed = false } = {}) {
  if (todayChipTimer) {
    clearTimeout(todayChipTimer);
    todayChipTimer = null;
  }
  const chip = root.querySelector(".today-chip");
  if (!chip) return;

  // Mark the collapse as DONE on the element AND the session. Flipping the
  // session flag here (not when scheduling) means re-renders that happen
  // before the timer fires keep the chip expanded instead of killing the
  // label the moment it appears.
  const collapse = () => {
    chip.classList.add("is-collapsed");
    todayChipSessionCollapsed = true;
  };

  // Table view: permanently minimized, no re-expansion.
  if (alwaysCollapsed) {
    chip.classList.add("is-collapsed");
    return;
  }

  // Already shown + collapsed in this away-session → start minimized.
  if (todayChipSessionCollapsed) {
    chip.classList.add("is-collapsed");
    // Re-render mid-session — don't replay the pop-in animation.
    chip.style.animation = "none";
    // Desktop: hovering still lets the user peek at the label.
    chip.addEventListener("pointerenter", () => {
      chip.classList.remove("is-collapsed");
      if (todayChipTimer) clearTimeout(todayChipTimer);
      todayChipTimer = setTimeout(collapse, 1400);
    });
    chip.addEventListener("pointerleave", () => {
      if (!chip.classList.contains("is-collapsed")) {
        if (todayChipTimer) clearTimeout(todayChipTimer);
        todayChipTimer = setTimeout(collapse, 600);
      }
    });
    return;
  }

  // First render of this away-session — keep it expanded and collapse once.
  // Re-renders (notes load, filter, view switch…) re-schedule instead of
  // force-collapsing, so the label is genuinely visible before it minimizes.
  if (!todayChipSessionStarted) {
    todayChipSessionStarted = true;
    offCurrentMonthCount += 1;
  } else {
    // Re-render mid-session — don't replay the pop-in animation.
    chip.style.animation = "none";
  }
  const holdMs = offCurrentMonthCount <= 1 ? firstHold : repeatHold;
  todayChipTimer = setTimeout(collapse, holdMs);
}

/* ---------------- compact today banner ---------------- */

function todayBannerHtml(s, today, todayKey) {
  const filter = s.filterGroup;
  const dateLine = `${formatWeekday(today.jy, today.jm, today.jd)} ${toPersianDigits(today.jd)} ${JALALI_MONTHS[today.jm - 1]}`;

  let shiftHtml;
  if (filter === "ALL") {
    shiftHtml = `
      <div class="today-banner-all" title="${GROUPS.map((g) => {
        const sh = calculateShift(today, g);
        return `گروه ${g}: ${SHIFT_TYPES[sh.type].fa}`;
      }).join("، ")}">
        ${GROUPS.map((g) => miniGroupBadge(g, calculateShift(today, g).type)).join("")}
      </div>`;
  } else {
    const shift = calculateShift(today, filter);
    const meta = SHIFT_TYPES[shift.type];
    // «شبکار دوم»، «استراحت اول» — type + cycle ordinal next to the icon.
    const ordinal = ORDINALS[Number(String(shift.code).slice(1))] || "";
    const label = ordinal ? `${meta.fa} ${ordinal}` : meta.fa;
    shiftHtml = `
      <span class="today-shift">
        <span class="today-shift-icon ${meta.badgeClass}" role="img" aria-label="${meta.fa}" title="${meta.fa}">
          ${icon(meta.icon)}
        </span>
        <span class="today-shift-label">${label}</span>
      </span>`;
  }

  return `
    <section class="today-banner glass-card" data-datekey="${todayKey}" role="button" tabindex="0"
      aria-label="شیفت امروز — ${dateLine}، باز کردن جزئیات">
      <span class="today-banner-pill">${dateLine}</span>
      ${shiftHtml}
    </section>`;
}

/* ---------------- legend ---------------- */

const ORDINALS = { 1: "اول", 2: "دوم", 3: "سوم", 4: "چهارم" };

function legendHtml() {
  return `
    <div class="cal-legend" aria-label="راهنمای شیفت‌ها">
      <span class="legend-item"><span class="legend-dot is-day"></span>روزکار</span>
      <span class="legend-item"><span class="legend-dot is-night"></span>شبکار</span>
      <span class="legend-item"><span class="legend-dot is-rest"></span>استراحت</span>
    </div>`;
}

/* ---------------- grid view ---------------- */

function cellShiftHtml(s, jy, jm, jd) {
  if (s.filterGroup === "ALL") {
    return GROUPS.map((g) => miniGroupBadge(g, calculateShift({ jy, jm, jd }, g).type)).join("");
  }
  const shift = calculateShift({ jy, jm, jd }, s.filterGroup);
  return shiftBadge(shift.type, { size: "sm", showLabel: false });
}

function gridHtml(jy, jm, s, todayKey) {
  const days = jalaaliMonthLength(jy, jm);
  const firstWeekday = jalaaliWeekday(jy, jm, 1);
  const cells = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push('<div class="cal-cell is-empty" aria-hidden="true"></div>');
  }

  for (let d = 1; d <= days; d++) {
    const key = makeDateKey(jy, jm, d);
    const holiday = getHoliday(jy, jm, d);
    const isToday = key === todayKey;
    const isSelected = state.ui.selectedDateKey === key;
    const hasNote = notesCache.has(key);
    cells.push(`
      <button type="button"
        class="cal-cell ${s.filterGroup === "ALL" ? "is-all" : ""} ${holiday ? "is-holiday" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}"
        data-datekey="${key}"
        aria-label="${formatJalali(jy, jm, d)}${holiday ? "، تعطیل" : ""}">
        <span class="cell-top">
          <span class="cell-day">${toPersianDigits(d)}</span>
          ${noteDotMarkup(hasNote)}
        </span>
        <span class="cell-badge">${cellShiftHtml(s, jy, jm, d)}</span>
      </button>`);
  }

  while (cells.length % 7 !== 0) {
    cells.push('<div class="cal-cell is-empty" aria-hidden="true"></div>');
  }

  return `
    <div class="cal-weekdays" aria-hidden="true">
      ${WEEKDAYS.map(
        (w) => `<span class="cal-weekday" title="${w}"><span class="wd-full">${w}</span><span class="wd-short">${w[0]}</span></span>`,
      ).join("")}
    </div>
    <div class="cal-grid">${cells.join("")}</div>`;
}

/* ---------------- table view (جدولی) ---------------- */

function tableHtml(jy, jm, s, todayKey, { hideHead = false } = {}) {
  const days = jalaaliMonthLength(jy, jm);
  const rows = [];
  const all = s.filterGroup === "ALL";

  for (let d = 1; d <= days; d++) {
    const key = makeDateKey(jy, jm, d);
    const holiday = getHoliday(jy, jm, d);
    const isToday = key === todayKey;
    const isFriday = jalaaliWeekday(jy, jm, d) === 6;
    const note = notesCache.get(key);

    let shiftHtml;
    if (all) {
      shiftHtml = GROUPS.map((g) => miniGroupBadge(g, calculateShift({ jy, jm, jd: d }, g).type)).join("");
    } else {
      shiftHtml = shiftCodeBadge(calculateShift({ jy, jm, jd: d }, s.filterGroup).code);
    }

    const occasion = holiday ? `<span class="table-occasion">${holiday.name}</span>` : "";
    const noteText = note
      ? note.noteText.length > NOTE_TABLE_CLAMP
        ? `${note.noteText.slice(0, NOTE_TABLE_CLAMP).trimEnd()}…`
        : note.noteText
      : "";
    const noteHtml = note ? `<span class="table-note" title="${escapeHtml(note.noteText)}">${icon("note")} ${escapeHtml(noteText)}</span>` : "";

    rows.push(`
      <tr class="${holiday ? "is-holiday" : ""} ${isFriday ? "is-friday" : ""} ${isToday ? "is-today" : ""}"
        data-datekey="${key}" tabindex="0"
        aria-label="${formatJalali(jy, jm, d)}، ${formatWeekday(jy, jm, d)}${holiday ? "، تعطیل" : ""}">
        <td class="table-day">${toPersianDigits(String(d).padStart(2, "0"))}</td>
        <td class="table-weekday">${WEEKDAYS[jalaaliWeekday(jy, jm, d)]}</td>
        <td class="table-shift">${shiftHtml}</td>
        <td class="table-occasion-cell">${occasion}${noteHtml}</td>
      </tr>`);
  }

  // The month is already shown in the page header, so the table head is
  // slim: a shift-status legend when همه is selected, a small hint otherwise.
  const headHtml = hideHead
    ? ""
    : `
      <div class="shift-table-head">
        ${s.filterGroup === "ALL" ? legendHtml() : `<span class="shift-table-hint">${icon("info")} برای جزئیات، روی هر روز ضربه بزنید</span>`}
      </div>`;

  return `
    <div class="shift-table glass-card">
      ${headHtml}
      <div class="shift-table-scroll">
        <table class="shift-table-grid">
          <thead>
            <tr><th>روز</th><th>هفته</th><th>شیفت</th><th>مناسبت و یادداشت</th></tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    </div>`;
}

/* ---------------- fullscreen table ---------------- */

function openTableFullscreen() {
  const overlay = document.createElement("div");
  overlay.className = "table-fullscreen";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "جدول شیفت‌کاری تمام‌صفحه");
  document.body.appendChild(overlay);
  lockBodyScroll();
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  // The hardware/system back button closes the fullscreen table instead of
  // leaving the app (shared back-stack with the bottom sheets).
  let historyPushed = false;
  try {
    history.pushState({ tfFullscreen: true }, "");
    historyPushed = true;
  } catch (err) {
    /* sandboxed environments may block history — back just won't close */
  }
  const unregisterBack = registerBackHandler(() => close(true));

  // Keep in sync with the calendar page state (month, filter, notes).
  const unsub = state.subscribe(() => {
    if (overlay.isConnected) render();
  });

  function render() {
    const s = state.settings;
    let jy = Number(s.viewYear) || 1405;
    let jm = Number(s.viewMonth) || 5;
    const today = todayJalaali();
    const todayKey = makeDateKey(today.jy, today.jm, today.jd);
    const isCurrentMonth = jy === today.jy && jm === today.jm;

    // The month nav in the header already shows the month, so the table has
    // no title of its own; a slim legend appears only when همه is selected.
    // «برو به امروز» is a small floating circle on the right edge (never in
    // the header) and only shows while viewing a month other than the
    // current one.
    overlay.innerHTML = `
      <div class="tf-header">
        <div class="tf-nav">
          <button type="button" class="icon-btn" data-tf="prev" aria-label="ماه قبل">${icon("chevronRight")}</button>
          <button type="button" class="tf-title" data-tf="picker" aria-label="انتخاب ماه و سال">
            <span>${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}</span>
            <span class="tf-caret">${icon("chevronDown")}</span>
          </button>
          <button type="button" class="icon-btn" data-tf="next" aria-label="ماه بعد">${icon("chevronLeft")}</button>
        </div>
        <div class="tf-actions">
          <button type="button" class="icon-btn tf-collapse" data-tf="close" aria-label="بازگشت به نمای تقویم">${icon("collapse")}</button>
        </div>
      </div>
      ${s.filterGroup === "ALL" ? `<div class="tf-legend">${legendHtml()}</div>` : ""}
      <div class="tf-body">
        ${tableHtml(jy, jm, s, todayKey, { hideHead: true })}
      </div>
      ${isCurrentMonth ? "" : `<button type="button" class="tf-today-fab" data-tf="today" title="برو به امروز" aria-label="رفتن به امروز">${icon("calendar")}</button>`}`;

    overlay.querySelector('[data-tf="prev"]').addEventListener("click", () => shiftMonth(-1));
    overlay.querySelector('[data-tf="next"]').addEventListener("click", () => shiftMonth(1));
    overlay.querySelector('[data-tf="picker"]').addEventListener("click", openMonthPicker);
    // Same swipe gesture as the calendar page: swipe RIGHT on the fullscreen
    // header → next month, LEFT → previous month. The table body below only
    // scrolls and never changes the month.
    const tfHeader = overlay.querySelector(".tf-header");
    if (tfHeader) wireSwipeMonthNav(tfHeader);
    const tfToday = overlay.querySelector('[data-tf="today"]');
    if (tfToday) tfToday.addEventListener("click", goToTodayFullscreen);
    overlay.querySelector('[data-tf="close"]').addEventListener("click", () => close());
    overlay.querySelectorAll("tr[data-datekey]").forEach((tr) => {
      tr.addEventListener("click", () => openDayDetail(tr.dataset.datekey));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDayDetail(tr.dataset.datekey);
        }
      });
    });
  }

  /** Jump to the current month and scroll today's row into view. */
  function goToTodayFullscreen() {
    const t = todayJalaali();
    const todayKey = makeDateKey(t.jy, t.jm, t.jd);
    state.set({ viewYear: t.jy, viewMonth: t.jm });
    state.setUi({ selectedDateKey: todayKey });
    requestAnimationFrame(() => {
      const tr = overlay.querySelector("tr.is-today");
      if (!tr) return;
      const scroller = overlay.querySelector(".tf-body .shift-table-scroll");
      if (scroller) {
        const rect = tr.getBoundingClientRect();
        const cont = scroller.getBoundingClientRect();
        scroller.scrollTo({
          top: scroller.scrollTop + rect.top - cont.top - 12,
          behavior: "smooth",
        });
      }
      tr.classList.add("is-pulsing");
      setTimeout(() => tr.classList.remove("is-pulsing"), 1000);
    });
  }

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);

  function close(popClosed = false) {
    if (!overlay.isConnected) return;
    unregisterBack();
    document.removeEventListener("keydown", onKey);
    if (historyPushed && !popClosed) consumeBackEntry();
    unsub();
    overlay.classList.remove("is-open");
    unlockBodyScroll();
    setTimeout(() => overlay.remove(), 240);
  }

  render();
}

/* ---------------- events ---------------- */

function shiftMonth(delta) {
  const s = state.settings;
  let jy = Number(s.viewYear) || 1405;
  let jm = Number(s.viewMonth) || 5;
  jm += delta;
  if (jm < 1) {
    jm = 12;
    jy -= 1;
  } else if (jm > 12) {
    jm = 1;
    jy += 1;
  }
  state.set({ viewYear: jy, viewMonth: jm });
}

/** Jump back to the current month and make today prominent. */
function goToToday() {
  const t = todayJalaali();
  const todayKey = makeDateKey(t.jy, t.jm, t.jd);
  state.set({ viewYear: t.jy, viewMonth: t.jm });
  state.setUi({ selectedDateKey: todayKey });
  requestAnimationFrame(() => {
    const cell = container.querySelector(".cal-cell.is-today, tr.is-today");
    if (!cell) return;
    if (typeof cell.scrollIntoView === "function") {
      cell.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    cell.classList.add("is-pulsing");
    setTimeout(() => cell.classList.remove("is-pulsing"), 1000);
  });
}

function wireEvents(s) {
  container.querySelector('[data-action="prev"]').addEventListener("click", () => shiftMonth(-1));
  container.querySelector('[data-action="next"]').addEventListener("click", () => shiftMonth(1));
  container.querySelector('[data-action="picker"]').addEventListener("click", openMonthPicker);
  container.querySelector('[data-action="notes"]').addEventListener("click", openAllNotes);

  const todayChip = container.querySelector('[data-action="today"]');
  if (todayChip) todayChip.addEventListener("click", () => goToToday());

  const fullscreenBtn = container.querySelector('[data-action="fullscreen"]');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", openTableFullscreen);
  }

  const singleToggle = container.querySelector("[data-toggle-view]");
  if (singleToggle) {
    singleToggle.addEventListener("click", () => {
      state.set({ calendarViewType: currentView() === "grid" ? "table" : "grid" });
    });
  }

  container.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = btn.dataset.filter;
      // Keep the calendar filter and the personal group in sync.
      state.set({ filterGroup: g, myGroup: g });
    });
  });

  container.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => state.set({ calendarViewType: btn.dataset.view }));
  });

  container.querySelectorAll("[data-datekey]").forEach((el) => {
    el.addEventListener("click", () => openDayDetail(el.dataset.datekey));
  });

  // Keyboard activation for non-button day elements (banner, table rows).
  container.querySelectorAll('[data-datekey][tabindex="0"]').forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDayDetail(el.dataset.datekey);
      }
    });
  });

  // Swipe between months — same logic as the onboarding screen, direction:
  // swipe RIGHT → next month, swipe LEFT → previous month (a horizontal
  // wheel/trackpad scroll also works on desktop).
  //  - grid view: anywhere in the calendar body
  //  - table view: ONLY on the slim table header (the hint/legend strip) —
  //    the table body keeps its native scroll and never changes the month.
  const body = container.querySelector(".cal-body");
  const swipeArea =
    currentView() === "grid" ? body : container.querySelector(".shift-table-head");
  if (swipeArea) wireSwipeMonthNav(swipeArea);

  if (keyHandler) container.removeEventListener("keydown", keyHandler);
  keyHandler = (e) => {
    // Matches the swipe direction: right = next month.
    if (e.key === "ArrowRight") {
      shiftMonth(1);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      shiftMonth(-1);
      e.preventDefault();
    }
  };
  container.addEventListener("keydown", keyHandler);
}

/* ---------------- month swipe navigation ---------------- */

/** Block the browser click that follows a completed swipe so it can't open
 *  the day that happened to be under the finger when the gesture ended. */
function blockNextClick() {
  const onCapture = (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.removeEventListener("click", onCapture, true);
  };
  document.addEventListener("click", onCapture, true);
  setTimeout(() => document.removeEventListener("click", onCapture, true), 600);
}

/**
 * Horizontal swipe navigation for a month grid or table header — the same
 * simple logic as the onboarding screen: record the touch start, then decide
 * on touch end from the travelled distance. No touchmove interception and no
 * preventDefault — the swipe area only carries `touch-action: pan-y` in CSS
 * so horizontal drags are never claimed as page scrolls (which is what made
 * the earlier interception-based handlers silently never fire).
 *
 *  - Touch swipe: RIGHT → next month, LEFT → previous month.
 *  - Horizontal wheel / trackpad: scroll RIGHT → next month, scroll LEFT →
 *    previous month (debounced so a long single scroll moves one month).
 *
 * A completed swipe also suppresses the click that would otherwise open the
 * day that happened to be under the finger when the gesture ended.
 */
function wireSwipeMonthNav(area) {
  let startX = null;
  let startY = null;

  area.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );

  area.addEventListener(
    "touchend",
    (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        // RIGHT swipe → next month, LEFT swipe → previous (RTL convention,
        // identical to the onboarding screen).
        shiftMonth(dx > 0 ? 1 : -1);
        blockNextClick();
      }
      startX = null;
      startY = null;
    },
    { passive: true },
  );

  // Horizontal wheel / trackpad gesture: scrolling right goes forward.
  let wheelLockUntil = 0;
  area.addEventListener(
    "wheel",
    (e) => {
      const dx = e.deltaX;
      const dy = e.deltaY;
      if (Math.abs(dx) < 24 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const now = Date.now();
      if (now < wheelLockUntil) {
        e.preventDefault();
        return;
      }
      wheelLockUntil = now + 350;
      shiftMonth(dx > 0 ? 1 : -1);
      e.preventDefault();
    },
    { passive: false },
  );
}

/* ---------------- notes ---------------- */

async function loadNotes(jy, jm) {
  const monthKey = `${jy}-${jm}`;
  const notesVersion = state.notesVersion;
  if (lastLoadedMonth === monthKey && lastLoadedNotesVersion === notesVersion) return;
  lastLoadedMonth = monthKey;
  lastLoadedNotesVersion = notesVersion;

  try {
    const notes = await getNotesForMonth(jy, jm);
    const s = state.settings;
    if (Number(s.viewYear) !== jy || Number(s.viewMonth) !== jm) return; // stale response
    notesCache = new Map(notes.map((n) => [n.dateKey, n]));
    if (container && container.isConnected) draw();
  } catch (err) {
    console.error("Failed to load notes:", err);
  }
}
