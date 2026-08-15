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
import { GROUPS, SHIFT_TYPES } from "../domain/models.js";
import { getNotesForMonth } from "../core/storage.js";
import { openDayDetail } from "../components/day-detail.js";
import { openMonthPicker } from "../components/month-picker.js";
import { openAllNotes, noteDotMarkup } from "../components/notes.js";
import { shiftBadge, shiftCodeBadge, miniGroupBadge } from "../components/shift-badge.js";
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

  container.innerHTML = `
    ${isCurrentMonth ? "" : todayFabHtml()}
    <div class="cal-wrap">
      ${todayBannerHtml(s, today, todayKey)}

      <div class="cal-nav-row">
        <div class="cal-nav-start">
          <button type="button" class="icon-btn cal-nav-btn" data-action="prev" aria-label="ماه قبل">${icon("chevronRight")}</button>
          <button type="button" class="chip chip-all ${s.filterGroup === "ALL" ? "is-active" : ""}" data-filter="ALL" aria-label="نمایش همه گروه‌ها">همه</button>
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
          <button type="button" class="icon-btn cal-nav-btn" data-action="next" aria-label="ماه بعد">${icon("chevronLeft")}</button>
        </div>
      </div>

      <div class="cal-actions">
        <div class="group-filter" role="group" aria-label="فیلتر گروه">
          ${GROUPS.map(
            (g) => `
            <button type="button" class="chip chip-letter ${s.filterGroup === g ? "is-active" : ""}" data-filter="${g}" aria-label="گروه ${g}">${g}</button>`,
          ).join("")}
        </div>
        ${view === "table" ? `<button type="button" class="icon-btn" data-action="fullscreen" aria-label="جدول تمام‌صفحه">${icon("expand")}</button>` : ""}
      </div>

      ${view === "grid" && s.filterGroup === "ALL" ? legendHtml() : ""}

      <section class="cal-body" aria-label="تقویم ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}">
        ${view === "grid" ? gridHtml(jy, jm, s, todayKey) : tableHtml(jy, jm, s, todayKey)}
      </section>
    </div>`;

  wireEvents(s);
  loadNotes(jy, jm);
}

/* ---------------- "go to today" floating button ---------------- */

function todayFabHtml() {
  return `
    <button type="button" class="today-fab" data-action="today" aria-label="رفتن به شیفت امروز">
      ${icon("calendar")} برو به شیفت امروز
    </button>`;
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
      }).join("， ")}">
        ${GROUPS.map((g) => miniGroupBadge(g, calculateShift(today, g).type)).join("")}
      </div>`;
  } else {
    const shift = calculateShift(today, filter);
    const meta = SHIFT_TYPES[shift.type];
    shiftHtml = `
      <span class="today-shift-icon ${meta.badgeClass}" role="img" aria-label="${meta.fa}" title="${meta.fa}">
        ${icon(meta.icon)}
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
      ${WEEKDAYS.map((w) => `<span class="cal-weekday">${w}</span>`).join("")}
    </div>
    <div class="cal-grid">${cells.join("")}</div>`;
}

/* ---------------- table view (جدولی) ---------------- */

function tableHtml(jy, jm, s, todayKey) {
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
    const noteHtml = note ? `<span class="table-note">${icon("note")} ${note.noteText}</span>` : "";

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

  return `
    <div class="shift-table glass-card">
      <div class="shift-table-head">
        <span class="shift-table-title">جدول شیفت‌کاری ${JALALI_MONTHS[jm - 1]}</span>
        <span class="shift-table-hint">${icon("info")} برای جزئیات، روی هر روز ضربه بزنید</span>
      </div>
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
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => overlay.classList.add("is-open"));

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
          ${isCurrentMonth ? "" : `<button type="button" class="tf-today" data-tf="today">${icon("calendar")} برو به امروز</button>`}
          <button type="button" class="icon-btn tf-collapse" data-tf="close" aria-label="بازگشت به نمای تقویم">${icon("collapse")}</button>
        </div>
      </div>
      <div class="tf-body">
        ${tableHtml(jy, jm, s, todayKey)}
      </div>`;

    overlay.querySelector('[data-tf="prev"]').addEventListener("click", () => shiftMonth(-1));
    overlay.querySelector('[data-tf="next"]').addEventListener("click", () => shiftMonth(1));
    overlay.querySelector('[data-tf="picker"]').addEventListener("click", openMonthPicker);
    const todayBtn = overlay.querySelector('[data-tf="today"]');
    if (todayBtn) todayBtn.addEventListener("click", () => goToToday());
    overlay.querySelector('[data-tf="close"]').addEventListener("click", close);
    overlay.querySelectorAll("tr[data-datekey]").forEach((tr) => {
      tr.addEventListener("click", () => openDayDetail(tr.dataset.datekey));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDayDetail(tr.dataset.datekey);
        }
      });
    });
    sizeTableBody();
  }

  /** Bound the scroll area to the space below the header — a hard cap that
      works even where flexbox min-height handling misbehaves (old Safari). */
  function sizeTableBody() {
    const header = overlay.querySelector(".tf-header");
    const body = overlay.querySelector(".tf-body");
    if (!header || !body) return;
    body.style.maxHeight = `calc(100dvh - ${header.offsetHeight}px)`;
  }
  window.addEventListener("resize", sizeTableBody);

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);

  function close() {
    if (!overlay.isConnected) return;
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", sizeTableBody);
    unsub();
    overlay.classList.remove("is-open");
    document.body.classList.remove("sheet-open");
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

  const todayFab = container.querySelector('[data-action="today"]');
  if (todayFab) {
    todayFab.addEventListener("click", () => goToToday());
  }

  const fullscreenBtn = container.querySelector('[data-action="fullscreen"]');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", openTableFullscreen);
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
