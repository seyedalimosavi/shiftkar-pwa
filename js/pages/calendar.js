/**
 * Calendar page — the primary screen.
 * Jalali month grid/list, today card, group filter, notes, swipe navigation.
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
  toGregorian,
  formatGregorian,
} from "../domain/jalali.js";
import { calculateShift } from "../domain/shift-calculator.js";
import { getHoliday } from "../domain/holidays.js";
import { GROUPS, GROUP_FA, GROUP_FILTERS } from "../domain/models.js";
import { getNotesForMonth } from "../core/storage.js";
import { openDayDetail } from "../components/day-detail.js";
import { openMonthPicker } from "../components/month-picker.js";
import { openAllNotes, noteDotMarkup } from "../components/notes.js";
import { shiftBadge, miniGroupBadge } from "../components/shift-badge.js";
import { icon } from "../components/icons.js";

let container = null;
let unsubscribe = null;
let notesCache = new Map();
let lastLoadedMonth = null;
let lastLoadedNotesVersion = -1;
let windowListenerAttached = false;
let keyHandler = null;

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
      if (e.detail && e.detail.dateKey) openDayDetail(e.detail.dateKey);
    });
  }
  draw();
}

function draw() {
  const s = state.settings;
  let jy = Number(s.viewYear) || 1405;
  let jm = Number(s.viewMonth) || 5;
  if (jy < 1300 || jy > 1500) jy = 1405;
  if (jm < 1 || jm > 12) jm = 5;

  const today = todayJalaali();
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);

  container.innerHTML = `
    <div class="cal-wrap">
      <header class="cal-header">
        <div class="cal-nav">
          <button type="button" class="icon-btn cal-nav-btn" data-action="prev" aria-label="ماه قبل">${icon("chevronRight")}</button>
          <button type="button" class="cal-title-btn" data-action="picker" aria-label="انتخاب ماه و سال">
            <span class="cal-title">${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}</span>
            <span class="cal-title-caret">${icon("chevronDown")}</span>
          </button>
          <button type="button" class="icon-btn cal-nav-btn" data-action="next" aria-label="ماه بعد">${icon("chevronLeft")}</button>
        </div>
        <div class="cal-toolbar">
          <div class="view-toggle" role="group" aria-label="نمای تقویم">
            <button type="button" class="${s.calendarViewType === "grid" ? "is-active" : ""}" data-view="grid" aria-label="نمای شبکه‌ای">${icon("grid")}</button>
            <button type="button" class="${s.calendarViewType === "list" ? "is-active" : ""}" data-view="list" aria-label="نمای فهرستی">${icon("list")}</button>
          </div>
          <button type="button" class="icon-btn cal-notes-btn" data-action="notes" aria-label="همه یادداشت‌ها">${icon("note")}</button>
        </div>
      </header>

      ${todayCardHtml(s, today, todayKey)}

      <div class="group-filter" role="group" aria-label="فیلتر گروه">
        ${GROUP_FILTERS.map(
          (g) => `
          <button type="button" class="chip ${s.filterGroup === g ? "is-active" : ""}" data-filter="${g}">
            ${g === "ALL" ? "همه" : g}
          </button>`,
        ).join("")}
      </div>

      <section class="cal-body ${s.calendarViewType === "list" ? "is-list" : ""}" aria-label="تقویم ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}">
        ${s.calendarViewType === "grid" ? gridHtml(jy, jm, s, todayKey) : listHtml(jy, jm, s, todayKey)}
      </section>
    </div>`;

  wireEvents(s);
  loadNotes(jy, jm);
}

/* ---------------- today card ---------------- */

function todayCardHtml(s, today, todayKey) {
  const filter = s.filterGroup;
  const greg = toGregorian(today.jy, today.jm, today.jd);
  let shiftBlock;

  if (filter === "ALL") {
    shiftBlock = `
      <div class="today-all">
        ${GROUPS.map((g) => {
          const shift = calculateShift(today, g);
          return `
            <div class="today-all-row">
              <span class="today-all-group">${g}</span>
              ${shiftBadge(shift.type, { size: "sm" })}
            </div>`;
        }).join("")}
      </div>`;
  } else {
    const shift = calculateShift(today, filter);
    shiftBlock = `
      <div class="today-shift">
        <span class="today-shift-group">${GROUP_FA[filter]}</span>
        ${shiftBadge(shift.type, { size: "lg" })}
      </div>`;
  }

  return `
    <section class="today-card glass-card" aria-label="شیفت امروز">
      <div class="today-head">
        <span class="today-label">شیفت امروز</span>
        <span class="chip chip-today chip-sm">امروز</span>
      </div>
      <div class="today-date">${formatJalali(today.jy, today.jm, today.jd)} · ${formatWeekday(today.jy, today.jm, today.jd)}</div>
      <div class="today-gregorian">${formatGregorian(greg.gy, greg.gm, greg.gd)}</div>
      ${shiftBlock}
    </section>`;
}

/* ---------------- grid / list ---------------- */

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
        class="cal-cell ${holiday ? "is-holiday" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}"
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
      ${WEEKDAYS.map((w) => `<span class="cal-weekday">${w}</span>`).join("")}
    </div>
    <div class="cal-grid">${cells.join("")}</div>`;
}

function listHtml(jy, jm, s, todayKey) {
  const days = jalaaliMonthLength(jy, jm);
  const rows = [];
  for (let d = 1; d <= days; d++) {
    const key = makeDateKey(jy, jm, d);
    const holiday = getHoliday(jy, jm, d);
    const isToday = key === todayKey;
    const hasNote = notesCache.has(key);
    rows.push(`
      <button type="button" class="cal-row ${isToday ? "is-today" : ""}" data-datekey="${key}"
        aria-label="${formatJalali(jy, jm, d)}، ${formatWeekday(jy, jm, d)}">
        <span class="cal-row-date">
          <span class="cal-row-day">${toPersianDigits(d)}</span>
          <span class="cal-row-meta">${formatWeekday(jy, jm, d)}${holiday ? ' <span class="cal-row-holiday">· تعطیل</span>' : ""}</span>
        </span>
        <span class="cal-row-shift">${cellShiftHtml(s, jy, jm, d)}</span>
        ${noteDotMarkup(hasNote)}
      </button>`);
  }
  return `<div class="cal-list">${rows.join("")}</div>`;
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

function wireEvents(s) {
  container.querySelector('[data-action="prev"]').addEventListener("click", () => shiftMonth(-1));
  container.querySelector('[data-action="next"]').addEventListener("click", () => shiftMonth(1));
  container.querySelector('[data-action="picker"]').addEventListener("click", openMonthPicker);
  container.querySelector('[data-action="notes"]').addEventListener("click", openAllNotes);

  container.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener("click", () => state.set({ filterGroup: btn.dataset.filter }));
  });

  container.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener("click", () => state.set({ calendarViewType: btn.dataset.view }));
  });

  container.querySelectorAll("[data-datekey]").forEach((cell) => {
    cell.addEventListener("click", () => openDayDetail(cell.dataset.datekey));
  });

  const body = container.querySelector(".cal-body");
  if (body) {
    let startX = null;
    let startY = null;
    body.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true },
    );
    body.addEventListener(
      "touchend",
      (e) => {
        if (startX == null) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          shiftMonth(dx > 0 ? -1 : 1);
        }
        startX = null;
        startY = null;
      },
      { passive: true },
    );
  }

  if (keyHandler) container.removeEventListener("keydown", keyHandler);
  keyHandler = (e) => {
    if (e.key === "ArrowLeft") {
      shiftMonth(1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      shiftMonth(-1);
      e.preventDefault();
    }
  };
  container.addEventListener("keydown", keyHandler);
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
