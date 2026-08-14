/**
 * Systems page («سامانه‌ها»).
 *
 * The original Android source's external-system links are NOT part of this
 * project, and inventing URLs is explicitly forbidden by the spec — so this
 * page shows a graceful missing-data state instead of fake links.
 */
import { icon } from "../components/icons.js";

export function renderSystems(container) {
  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">سامانه‌ها</h1>
      <p class="page-subtitle">دسترسی به سامانه‌های مرتبط با شیفت‌کاری</p>
    </div>
    <div class="empty-state glass-card">
      <div class="empty-icon">${icon("systems")}</div>
      <h2>سامانه‌های خارجی در دسترس نیستند</h2>
      <p>لینک سامانه‌های خارجی از نسخهٔ اندرویدی اصلی در این نسخهٔ وب قرار داده نشده‌اند. پس از در دسترس قرار گرفتن لینک‌ها، از همین بخش به‌صورت امن باز خواهند شد.</p>
    </div>`;
}
