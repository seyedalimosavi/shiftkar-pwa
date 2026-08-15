/**
 * Systems page («سامانه‌ها»).
 * Real corporate portals, top to bottom, with descriptive icons.
 * Each card opens the link in a new window.
 */
import { icon } from "../components/icons.js";

const SYSTEMS = [
  { icon: "file", fa: "خلاصه پرونده", desc: "مشاهده خلاصه پرونده", href: "https://portal.nioc.ir" },
  { icon: "briefcase", fa: "پرتال", desc: "پرتال پتروشیمی بندر امام", href: "https://bipc.ir/fa/" },
  { icon: "clipboard", fa: "درخواست پرواز", desc: "سامانه درخواست پرواز", href: "https://travelrequest.bipc.ir/Guest/LoginPage.aspx" },
  { icon: "plane", fa: "برنامه پرواز ها", desc: "مشاهده برنامه پرواز ها", href: "https://www.posc.ir/fa/publicservices/mosaferat" },
  { icon: "food", fa: "رزرو غذا", desc: "سامانه رزرو غذا", href: "https://pooneh.bipc.ir/" },
  { icon: "chart", fa: "سهام", desc: "سامانه سهام", href: "https://sahamfasl.bipc.ir/" },
  { icon: "globe", fa: "نرم افزار شیفت‌کار (تحت وب)", desc: "نسخه تحت وب نرم افزار شیفت‌کار", href: "https://alimosavi-code.github.io" },
  { icon: "download", fa: "نرم افزار موبایل شیفت‌کار", desc: "دانلود نسخه موبایل نرم افزار شیفت‌کار", href: "https://alimosavi-code.github.io/download" },
];

export function renderSystems(container) {
  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">سامانه‌های شرکتی</h1>
      <p class="page-subtitle">دسترسی سریع به سامانه‌ها و پرتال‌های پرکاربرد کاری</p>
    </div>

    <div class="systems-grid" role="list" aria-label="سامانه‌های شرکتی">
      ${SYSTEMS.map(
        (sys, i) => `
        <a class="system-card glass-card" href="${sys.href}" target="_blank" rel="noopener noreferrer" role="listitem" aria-label="${sys.fa}">
          <span class="system-icon">${icon(sys.icon)}</span>
          <span class="system-name">${sys.fa}</span>
          <span class="system-desc">${sys.desc}</span>
          <span class="system-open">${icon("external")}</span>
        </a>`,
      ).join("")}
    </div>`;
}
