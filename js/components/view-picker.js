/**
 * View picker — calendar display mode (تقویم vs جدولی) with visual previews.
 * Used on onboarding and in Settings. Selection persists immediately.
 */
import { state } from "../core/state.js";

function gridPreview() {
  return `
    <span class="view-preview view-preview-grid" aria-hidden="true">
      <span class="vp-row-head"></span>
      <span class="vp-grid-row">
        <span class="vp-cell is-day"></span><span class="vp-cell is-rest"></span><span class="vp-cell is-night"></span><span class="vp-cell is-day"></span><span class="vp-cell is-holiday"></span><span class="vp-cell is-rest"></span><span class="vp-cell is-day"></span>
      </span>
      <span class="vp-grid-row">
        <span class="vp-cell is-night"></span><span class="vp-cell is-day"></span><span class="vp-cell is-rest"></span><span class="vp-cell is-night"></span><span class="vp-cell is-day"></span><span class="vp-cell is-rest"></span><span class="vp-cell is-night"></span>
      </span>
    </span>`;
}

function tablePreview() {
  const rows = [
    ["vp-dot is-rest", "vp-tbar is-rest", ""],
    ["vp-dot is-night", "vp-tbar is-night", "is-holiday"],
    ["vp-dot is-day", "vp-tbar is-day", ""],
    ["vp-dot is-day", "vp-tbar is-day", "is-holiday"],
  ];
  return `
    <span class="view-preview view-preview-table" aria-hidden="true">
      <span class="vp-table-head"><span></span><span></span><span></span><span></span></span>
      ${rows
        .map(
          ([dot, bar, extra]) => `
      <span class="vp-table-row ${extra}"><span class="vp-num"></span><span class="vp-bar"></span><span class="${dot}"></span><span class="vp-bar"></span></span>`,
        )
        .join("")}
    </span>`;
}

/** Markup for the picker; highlights the current setting. */
export function viewPickerMarkup() {
  const current = state.settings.calendarViewType || "grid";
  return `
    <div class="view-picker" role="radiogroup" aria-label="حالت نمایش تقویم">
      <button type="button" role="radio" aria-checked="${current === "grid"}"
        class="view-option ${current === "grid" ? "is-active" : ""}" data-view="grid">
        ${gridPreview()}
        <span class="view-label">تقویم</span>
      </button>
      <button type="button" role="radio" aria-checked="${current === "table"}"
        class="view-option ${current === "table" ? "is-active" : ""}" data-view="table">
        ${tablePreview()}
        <span class="view-label">جدولی</span>
      </button>
    </div>`;
}

/** Wire clicks inside a container that contains the picker markup. */
export function wireViewPicker(root) {
  root.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.set({ calendarViewType: btn.dataset.view });
      root.querySelectorAll("[data-view]").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", String(on));
      });
    });
  });
}
