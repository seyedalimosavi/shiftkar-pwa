/**
 * Bottom navigation (mobile) / sidebar (desktop).
 * Four primary sections: Calendar, Systems, Roster, Settings.
 */
import { navigate } from "../core/router.js";
import { icon } from "./icons.js";

const ITEMS = [
  { id: "calendar", fa: "تقویم", icon: "calendar" },
  { id: "systems", fa: "سامانه‌ها", icon: "systems" },
  { id: "roster", fa: "تابلو", icon: "roster" },
  { id: "settings", fa: "تنظیمات", icon: "settings" },
];

export function renderBottomNav(container, activeRoute) {
  container.hidden = false;
  container.innerHTML = `
    <div class="bottom-nav-inner" role="tablist" aria-label="بخش‌های اصلی برنامه">
      ${ITEMS.map(
        (it) => `
        <button type="button"
          class="nav-item ${it.id === activeRoute ? "is-active" : ""}"
          data-route="${it.id}"
          role="tab"
          aria-selected="${it.id === activeRoute}"
          aria-label="${it.fa}">
          <span class="nav-icon">${icon(it.icon)}</span>
          <span class="nav-label">${it.fa}</span>
        </button>`,
      ).join("")}
    </div>`;

  container.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });
}
