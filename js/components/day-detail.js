/**
 * Day detail bottom sheet: Persian/Gregorian dates, today & holiday status,
 * shifts for groups A–D, and the note editor.
 */
import {
  parseDateKey,
  formatJalali,
  formatGregorian,
  formatWeekday,
  todayJalaali,
  toGregorian,
} from "../domain/jalali.js";
import { calculateShift } from "../domain/shift-calculator.js";
import { getHoliday, getDayEvents } from "../domain/holidays.js";
import { GROUPS, GROUP_FA } from "../domain/models.js";
import { state } from "../core/state.js";
import { openSheet } from "./bottom-sheet.js";
import { shiftBadge } from "./shift-badge.js";
import { createNoteEditor } from "./notes.js";
import { icon } from "./icons.js";

function toFa(n) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/** Keep the day sheet compact: a day can carry dozens of occasions, and a
 *  wall of text pushes the shift rows and the note editor out of view.
 *  Occasions collapse into a single chip row («تعطیل رسمی + N مناسبت»);
 *  tapping the chip expands the full details behind it. */
export function openDayDetail(dateKey, opts = {}) {
  const { jy, jm, jd } = parseDateKey(dateKey);
  const g = toGregorian(jy, jm, jd);
  const today = todayJalaali();
  const isToday = today.jy === jy && today.jm === jm && today.jd === jd;
  const holiday = getHoliday(jy, jm, jd);
  const occasions = getDayEvents(jy, jm, jd).filter((e) => !e.isHoliday);
  const hasOccasions = occasions.length > 0;

  const content = document.createElement("div");
  content.className = "day-detail";

  const chips = [isToday ? '<span class="chip chip-today">امروز</span>' : ""].join("");

  content.innerHTML = `
    <div class="day-detail-dates">
      <span class="day-detail-jalali">${formatJalali(jy, jm, jd)}</span>
      <span class="day-detail-weekday">${formatWeekday(jy, jm, jd)}</span>
      <span class="day-detail-gregorian">${formatGregorian(g.gy, g.gm, g.gd)}</span>
    </div>
    ${chips ? `<div class="day-detail-chips">${chips}</div>` : ""}
    ${!hasOccasions && holiday ? `
      <div class="day-detail-holiday" role="note">
        <span class="day-detail-holiday-icon">${icon("holiday")}</span>
        <span class="day-detail-holiday-text">${holiday.name}</span>
      </div>` : ""}
    ${hasOccasions ? `
      <div class="day-detail-events">
        <button type="button" class="events-summary" data-toggle-events aria-expanded="false">
          <span class="events-summary-icon">${icon("holiday")}</span>
          <span class="events-summary-text">${holiday ? holiday.name : occasions[0].title}</span>
          <span class="events-summary-count">+${toFa(occasions.length)} مناسبت</span>
          <span class="events-summary-chevron">${icon("chevronDown")}</span>
        </button>
        <div class="events-details" data-events-details hidden>
          ${holiday ? `
            <div class="day-detail-holiday" role="note">
              <span class="day-detail-holiday-icon">${icon("holiday")}</span>
              <span class="day-detail-holiday-text">${holiday.name}</span>
            </div>` : ""}
          <div class="day-detail-occasions" role="note">
            <span class="day-detail-occasions-icon">${icon("holiday")}</span>
            <ul class="day-detail-occasions-list">
              ${occasions.map((o) => `<li>${o.title}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>` : ""}
    <div class="day-detail-groups">
      <div class="day-detail-groups-title">${icon("groups")} شیفت گروه‌ها</div>
      ${GROUPS.map((gr) => {
        const shift = calculateShift({ jy, jm, jd }, gr);
        const isMine = gr === state.settings.myGroup;
        return `
          <div class="group-shift-row ${isMine ? "is-mine" : ""}">
            <span class="group-shift-name">${GROUP_FA[gr]}${isMine ? ' <span class="group-shift-mine">شما</span>' : ""}</span>
            <span class="group-shift-value">
              <span class="group-shift-code">${shift.code}</span>
              ${shiftBadge(shift.type)}
            </span>
          </div>`;
      }).join("")}
    </div>`;

  // «تعطیل رسمی + N مناسبت» chip → expand/collapse the full details.
  const toggleBtn = content.querySelector("[data-toggle-events]");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const details = content.querySelector("[data-events-details]");
      const wasOpen = toggleBtn.getAttribute("aria-expanded") === "true";
      toggleBtn.setAttribute("aria-expanded", String(!wasOpen));
      toggleBtn.classList.toggle("is-open", !wasOpen);
      if (details) details.hidden = wasOpen;
    });
  }

  content.appendChild(createNoteEditor(dateKey, { startInEdit: opts.editNote === true }));

  state.setUi({ selectedDateKey: dateKey });

  const api = openSheet({
    title: "جزئیات روز",
    content,
    onClose: () => state.setUi({ selectedDateKey: null }),
  });

  // Coming from the all-notes list: bring the note section into view and
  // flash it so the user lands exactly where the note is.
  if (opts.focusNote || opts.editNote) {
    setTimeout(() => {
      const editor = api.body.querySelector(".note-editor");
      if (!editor) return;
      editor.scrollIntoView({ behavior: "smooth", block: "center" });
      editor.classList.add("note-flash");
      setTimeout(() => editor.classList.remove("note-flash"), 1500);
    }, 420);
  }
}
