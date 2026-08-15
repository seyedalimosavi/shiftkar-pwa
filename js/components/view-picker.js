/**
 * View picker — calendar display mode (تقویم vs جدولی) with visual previews.
 * Used on onboarding and in Settings. Selection persists immediately.
 * Both previews share the same outer size and head strip so the two cards
 * look perfectly coherent side by side.
 */
import { state } from "../core/state.js";

function gridPreview() {
  const rows = [
    ["is-rest", "is-rest", "is-day", "is-day", "is-night", "is-night", "is-rest"],
    ["is-rest", "is-day", "is-day", "is-night", "is-night", "is-rest", "is-rest"],
    ["is-day", "is-day", "is-night", "is-night", "is-rest", "is-rest", "is-holiday"],
  ];
  return `
    <span class="view-preview view-preview-grid" aria-hidden="true">
      <span class="vp-head"></span>
      ${rows
        .map(
          (row) => `
      <span class="vp-grid-row">${row.map((c) => `<span class="vp-cell ${c}"></span>`).join("")}</span>`,
        )
        .join("")}
    </span>`;
}

function tablePreview() {
  const rows = [
    ["vp-num", "vp-bar", "vp-dot is-rest", "vp-bar is-holiday"],
    ["vp-num", "vp-bar", "vp-dot is-night", "vp-bar"],
    ["vp-num", "vp-bar", "vp-dot is-day", "vp-bar is-holiday"],
    ["vp-num", "vp-bar", "vp-dot is-day", "vp-bar"],
  ];
  return `
    <span class="view-preview view-preview-table" aria-hidden="true">
      <span class="vp-head"></span>
      ${rows
        .map(
          (row) => `
      <span class="vp-table-row">${row
        .map((cls) => `<span class="${cls}"></span>`)
        .join("")}</span>`,
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
