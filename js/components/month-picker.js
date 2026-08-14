/**
 * Month/year picker: bottom sheet with year navigation and a 4×3 month grid.
 */
import { state } from "../core/state.js";
import { JALALI_MONTHS, toPersianDigits } from "../domain/jalali.js";
import { openSheet } from "./bottom-sheet.js";
import { icon } from "./icons.js";

export function openMonthPicker() {
  const year = { value: state.settings.viewYear };

  function build() {
    const holder = document.createElement("div");
    holder.className = "month-picker";
    holder.innerHTML = `
      <div class="month-picker-year">
        <button type="button" class="icon-btn" data-delta="-1" aria-label="سال قبل">${icon("chevronRight")}</button>
        <span class="month-picker-year-label">${toPersianDigits(year.value)}</span>
        <button type="button" class="icon-btn" data-delta="1" aria-label="سال بعد">${icon("chevronLeft")}</button>
      </div>
      <div class="month-grid" role="grid" aria-label="ماه‌های سال">
        ${JALALI_MONTHS.map(
          (m, i) => `
          <button type="button" class="month-cell ${i + 1 === state.settings.viewMonth && year.value === state.settings.viewYear ? "is-current" : ""}"
            data-month="${i + 1}" role="gridcell">${m}</button>`,
        ).join("")}
      </div>`;
    return holder;
  }

  function wire(api) {
    api.body.querySelector('[data-delta="-1"]').addEventListener("click", () => {
      year.value -= 1;
      api.body.innerHTML = "";
      api.body.appendChild(build());
      wire(api);
    });
    api.body.querySelector('[data-delta="1"]').addEventListener("click", () => {
      year.value += 1;
      api.body.innerHTML = "";
      api.body.appendChild(build());
      wire(api);
    });
    api.body.querySelectorAll(".month-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.set({ viewYear: year.value, viewMonth: Number(btn.dataset.month) });
        api.close();
      });
    });
  }

  const api = openSheet({
    title: "انتخاب ماه و سال",
    content: build(),
    onMount: wire,
  });
}
