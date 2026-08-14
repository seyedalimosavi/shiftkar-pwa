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
import { getHoliday } from "../domain/holidays.js";
import { GROUPS, GROUP_FA } from "../domain/models.js";
import { state } from "../core/state.js";
import { openSheet } from "./bottom-sheet.js";
import { shiftBadge } from "./shift-badge.js";
import { createNoteEditor } from "./notes.js";
import { icon } from "./icons.js";

export function openDayDetail(dateKey) {
  const { jy, jm, jd } = parseDateKey(dateKey);
  const g = toGregorian(jy, jm, jd);
  const today = todayJalaali();
  const isToday = today.jy === jy && today.jm === jm && today.jd === jd;
  const holiday = getHoliday(jy, jm, jd);

  const content = document.createElement("div");
  content.className = "day-detail";

  const chips = [
    isToday ? '<span class="chip chip-today">امروز</span>' : "",
    holiday ? `<span class="chip chip-holiday">تعطیل — ${holiday.name}</span>` : "",
  ].join("");

  content.innerHTML = `
    <div class="day-detail-dates">
      <span class="day-detail-jalali">${formatJalali(jy, jm, jd)}</span>
      <span class="day-detail-weekday">${formatWeekday(jy, jm, jd)}</span>
      <span class="day-detail-gregorian">${formatGregorian(g.gy, g.gm, g.gd)}</span>
    </div>
    ${chips ? `<div class="day-detail-chips">${chips}</div>` : ""}
    <div class="day-detail-groups">
      <div class="day-detail-groups-title">${icon("groups")} شیفت گروه‌ها</div>
      ${GROUPS.map((gr) => {
        const shift = calculateShift({ jy, jm, jd }, gr);
        return `
          <div class="group-shift-row">
            <span class="group-shift-name">${GROUP_FA[gr]}</span>
            ${shiftBadge(shift.type, { group: gr })}
          </div>`;
      }).join("")}
    </div>`;

  content.appendChild(createNoteEditor(dateKey));

  state.setUi({ selectedDateKey: dateKey });

  openSheet({
    title: "جزئیات روز",
    content,
    onClose: () => state.setUi({ selectedDateKey: null }),
  });
}
