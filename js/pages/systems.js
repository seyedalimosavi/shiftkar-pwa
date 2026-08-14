/**
 * Systems page («سامانه‌ها»).
 *
 * The original Android source's external-system links are not part of this
 * project, so this page shows a set of clearly-labeled EXAMPLE systems.
 * Replace the entries with real names/URLs when they become available.
 */
import { icon } from "../components/icons.js";
import { toast } from "../components/dialogs.js";

const SYSTEMS = [
  { icon: "settings", fa: "سامانه حقوق و دستمزد", desc: "مشاهده فیش حقوقی و احکام" },
  { icon: "roster", fa: "سامانه حضور و غیاب", desc: "ثبت و بررسی تردد روزانه" },
  { icon: "calendar", fa: "سامانه درخواست مرخصی", desc: "ثبت و پیگیری مرخصی‌ها" },
  { icon: "groups", fa: "پورتال کارکنان", desc: "خدمات اداری و اطلاعات پرسنلی" },
  { icon: "note", fa: "سامانه نوبت‌دهی", desc: "رزرو نوبت و برنامه‌ریزی" },
  { icon: "systems", fa: "سامانه پیامکی", desc: "اطلاع‌رسانی و هشدارهای مهم" },
  { icon: "info", fa: "سامانه بیمه", desc: "استعلام سوابق بیمه‌ای" },
  { icon: "grid", fa: "سامانه مالیات", desc: "استعلام و پرداخت مالیات" },
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
        <button type="button" class="system-card glass-card" data-system="${i}" role="listitem" aria-label="${sys.fa}">
          <span class="system-icon">${icon(sys.icon)}</span>
          <span class="system-name">${sys.fa}</span>
          <span class="system-desc">${sys.desc}</span>
          <span class="system-open">${icon("external")}</span>
        </button>`,
      ).join("")}
    </div>

    <p class="systems-note">لینک‌های بالا نمونه هستند و در نسخهٔ نهایی با نشانی واقعی سامانه‌ها جایگزین می‌شوند.</p>`;

  container.querySelectorAll("[data-system]").forEach((btn) => {
    btn.addEventListener("click", () => {
      toast("لینک نمونه — در نسخهٔ نهایی در دسترس است");
    });
  });
}
