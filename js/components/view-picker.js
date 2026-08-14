/**
 * View picker — calendar display mode (grid vs list) with visual previews.
 * Used on onboarding and in Settings. Selection persists immediately.
 */
import { state } from "../core/state.js";

const GRID_CELLS = `
  <span class="vp-cell is-day"></span><span class="vp-cell is-rest"></span><span class="vp-cell is-night"></span><span class="vp-cell is-day"></span><span class="vp-cell is-holiday"></span><span class="vp-cell is-rest"></span><span class="vp-cell is-day"></span>`;

function gridPreview() {
  return `
    <span class="view-preview view-preview-grid" aria-hidden="true">
      <span class="vp-row-head"></span>
      <span class="vp-grid-row">${GRID_CELLS}</span>
      <span class="vp-grid-row">${GRID_CELLS}</span>
    </span>`;
}

function listPreview() {
  const rows = [["is-day"], ["is-night"], ["is-rest"], ["is-day"]];
  return `
    <span class="view-preview view-preview-list" aria-hidden="true">
      <span class="vp-list-head"></span>
      ${rows
        .map(
          (r) => `
      <span class="vp-list-row"><span class="vp-dot ${r[0]}"></span><span class="vp-bar"></span></span>`,
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
        <span class="view-label">شبکه‌ای (جدولی)</span>
      </button>
      <button type="button" role="radio" aria-checked="${current === "list"}"
        class="view-option ${current === "list" ? "is-active" : ""}" data-view="list">
        ${listPreview()}
        <span class="view-label">فهرستی (تقویمی)</span>
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
