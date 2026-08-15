/**
 * Systems page («سامانه‌ها»).
 *
 * The original Android source's external-system links are not part of this
 * project, so this page shows clearly-labeled EXAMPLE systems with TEST
 * links. Replace the hrefs with real URLs when they become available.
 */
import { icon } from "../components/icons.js";

const SYSTEMS = [
  { icon: "settings", fa: "سامانه حقوق و دستمزد", desc: "مشاهده فیش حقوقی و احکام", href: "https://example.com/shiftkar/payroll" },
  { icon: "roster", fa: "سامانه حضور و غیاب", desc: "ثبت و بررسی تردد روزانه", href: "https://example.com/shiftkar/attendance" },
  { icon: "calendar", fa: "سامانه درخواست مرخصی", desc: "ثبت و پیگیری مرخصی‌ها", href: "https://example.com/shiftkar/leave" },
  { icon: "groups", fa: "پورتال کارکنان", desc: "خدمات اداری و اطلاعات پرسنلی", href: "https://example.com/shiftkar/portal" },
  { icon: "note", fa: "سامانه نوبت‌دهی", desc: "رزرو نوبت و برنامه‌ریزی", href: "https://example.com/shiftkar/appointment" },
  { icon: "systems", fa: "سامانه پیامکی", desc: "اطلاع‌رسانی و هشدارهای مهم", href: "https://example.com/shiftkar/sms" },
  { icon: "info", fa: "سامانه بیمه", desc: "استعلام سوابق بیمه‌ای", href: "https://example.com/shiftkar/insurance" },
  { icon: "grid", fa: "سامانه مالیات", desc: "استعلام و پرداخت مالیات", href: "https://example.com/shiftkar/tax" },
];

export function renderSystems(container) {
  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">سامانه‌ها</h1>
      <p class="page-subtitle">دسترسی سریع به سامانه‌های مرتبط با شیفت‌کاری</p>
    </div>

    <div class="systems-grid" role="list" aria-label="سامانه‌ها">
      ${SYSTEMS.map(
        (sys, i) => `
        <a class="system-card glass-card" href="${sys.href}" target="_blank" rel="noopener noreferrer" role="listitem" aria-label="${sys.fa}">
          <span class="system-icon">${icon(sys.icon)}</span>
          <span class="system-name">${sys.fa}</span>
          <span class="system-desc">${sys.desc}</span>
          <span class="system-open">${icon("external")}</span>
        </a>`,
      ).join("")}
    </div>

    <p class="systems-note">لینک‌های بالا آزمایشی هستند (example.com) و در نسخهٔ نهایی با نشانی واقعی سامانه‌ها جایگزین می‌شوند.</p>`;
}
