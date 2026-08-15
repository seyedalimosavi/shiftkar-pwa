/**
 * Settings page: personal group, theme, calendar view, help, about,
 * contact, and restart onboarding. All choices persist immediately.
 */
import { state } from "../core/state.js";
import { navigate } from "../core/router.js";
import { toPersianDigits } from "../domain/jalali.js";
import { GROUP_FILTERS, THEMES, THEME_MODES, APP_INFO } from "../domain/models.js";
import { icon } from "../components/icons.js";
import { confirmDialog, toast } from "../components/dialogs.js";
import { viewPickerMarkup, wireViewPicker } from "../components/view-picker.js";
import { getInstallState, showInstallSheet } from "../components/install-prompt.js";

let container = null;
let unsubscribe = null;
let installStateHandler = null;

export function renderSettings(el) {
  container = el;
  if (!unsubscribe) {
    unsubscribe = state.subscribe(() => {
      if (container && container.isConnected) draw();
    });
  }
  draw();
}

// Official contact channels of the app.
const CONTACTS = [
  { id: "whatsapp-pv", fa: "پیام خصوصی واتساپ", icon: "whatsapp", href: "https://wa.me/989163548578" },
  { id: "phone", fa: "تماس تلفنی", icon: "phone", href: "tel:09163548578" },
  { id: "whatsapp-group", fa: "گروه واتساپ", icon: "whatsapp", href: "https://chat.whatsapp.com/5HolMMoVnojCdh8GjhSZo2" },
  { id: "eitaa", fa: "گروه ایتا", icon: "eitaa", href: "https://eitaa.com/joinchat/929104214C56d88e3e24" },
  { id: "telegram", fa: "تلگرام", icon: "telegram", href: "https://t.me/h_mosavi_s" },
];

const HELP_ITEMS = [
  {
    title: "محاسبه شیفت",
    body: `چرخهٔ شیفت دقیقاً ۸ روز است: دو روز کاری (M1، M2)، دو روز شب‌کاری (N1، N2) و سپس چهار روز استراحت (R1 تا R4).\nتاریخ پایه: ۱۴۰۵/۰۵/۰۴. افست گروه‌ها: A=7، B=1، C=5، D=3.\nشاخص هر روز با فرمول floorMod(تعداد روز از تاریخ پایه + افست گروه، ۸) به‌دست می‌آید؛ به این ترتیب تاریخ‌های قبل از تاریخ پایه هم درست محاسبه می‌شوند.`,
  },
  {
    title: "گروه‌های شیفت",
    body: "چهار گروه A تا D وجود دارد. گروه شخصی خود را از بخش «گروه شخصی» انتخاب کنید؛ تقویم به‌طور پیش‌فرض بر اساس آن نمایش داده می‌شود. با فیلتر «همه» روی تقویم، وضعیت هر چهار گروه در یک نگاه دیده می‌شود.",
  },
  {
    title: "انواع شیفت",
    body: "سه وضعیت نمایشی وجود دارد:\n• روزکار — شیفت روزانه\n• شبکار — شیفت شبانه\n• استراحت — روزهای استراحت\nهر وضعیت با رنگ و نشان اختصاصی در تقویم نمایش داده می‌شود.",
  },
  {
    title: "تقویم",
    body: "تقویم بر اساس تاریخ هجری شمسی است و هفته از شنبه آغاز می‌شود. با دکمه‌های کنار عنوان ماه یا کشیدن انگشت بین ماه‌ها جابه‌جا شوید؛ روی عنوان ماه بزنید تا ماه و سال را انتخاب کنید. دو حالت نمایش تقویم (شبکه‌ای) و جدولی در دسترس است؛ نمای جدولی دکمه‌ای برای تمام‌صفحه شدن دارد و نوار ماه همان‌طور کار می‌کند.",
  },
  {
    title: "یادداشت‌ها",
    body: "برای هر روز یک یادداشت ذخیره می‌شود. روزهای دارای یادداشت با یک نقطهٔ کوچک در تقویم مشخص می‌شوند. با آیکون یادداشت در بالای تقویم، همهٔ یادداشت‌ها را مرور، ویرایش یا حذف کنید. یادداشت‌ها روی دستگاه شما (IndexedDB) ذخیره می‌شوند و بدون اینترنت هم در دسترس‌اند.",
  },
  {
    title: "تم‌ها",
    body: "شش تم رنگی در دسترس است: آبی، زمردی، بنفش، نارنجی، رز و فیروزه‌ای. تم انتخابی ذخیره می‌شود و بلافاصله در کل برنامه اعمال می‌گردد.",
  },
  {
    title: "تعطیلات",
    body: "تعطیلات رسمی ایران برای سال‌های ۱۴۰۴ تا ۱۴۰۶ درج شده است: تعطیلات ثابت شمسی (نوروز، روز جمهوری اسلامی، رحلت امام خمینی، قیام ۱۵ خرداد، پیروزی انقلاب اسلامی و ملی شدن صنعت نفت) و تعطیلات قمری (عید فطر، قربان، غدیر، تاسوعا و عاشورا، اربعین و …) که هر سال حدود ۱۱ روز جابه‌جا می‌شوند. روزهای تعطیل با رنگ قرمز مشخص می‌شوند و نام مناسبت در جزئیات هر روز نمایش داده می‌شود.",
  },
];

function draw() {
  const s = state.settings;

  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">تنظیمات</h1>
      <p class="page-subtitle">شخصی‌سازی برنامه</p>
    </div>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("groups")} گروه شیفت</h2>
      <p class="settings-desc">گروه نمایش تقویم را انتخاب کنید؛ «همه» یعنی نمایش هر چهار گروه. همیشه با فیلتر گروه در تقویم هماهنگ است.</p>
      <div class="segmented" role="group" aria-label="گروه شیفت">
        ${GROUP_FILTERS.map((g) => `
          <button type="button" class="segment ${s.myGroup === g ? "is-active" : ""}" data-mygroup="${g}">
            ${g === "ALL" ? "همه" : g}
          </button>`).join("")}
      </div>
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("palette")} حالت نمایش</h2>
      <p class="settings-desc">روشن، تیره یا پیروی از تم سیستم؛ تغییر به‌صورت زنده اعمال می‌شود.</p>
      <div class="theme-mode-grid" role="group" aria-label="حالت نمایش">
        ${THEME_MODES.map((m) => `
          <button type="button" class="theme-mode-option ${s.themeMode === m.id ? "is-active" : ""}" data-thememode="${m.id}"
            aria-label="${m.fa}">
            ${icon(m.icon, "theme-mode-icon")}
            <span class="theme-mode-name">${m.fa}</span>
          </button>`).join("")}
      </div>
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("palette")} رنگ اصلی</h2>
      <p class="settings-desc">رنگ اصلی برنامه را انتخاب کنید.</p>
      <div class="theme-grid" role="group" aria-label="انتخاب تم">
        ${THEMES.map((t) => `
          <button type="button" class="theme-option ${s.theme === t.id ? "is-active" : ""}" data-theme="${t.id}"
            aria-label="تم ${t.fa}">
            <span class="theme-swatch" style="--swatch: ${t.color}"></span>
            <span class="theme-name">${t.fa}</span>
          </button>`).join("")}
      </div>
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("grid")} نمای تقویم</h2>
      <p class="settings-desc">حالت نمایش تقویم (شبکه‌ای) یا جدولی را انتخاب کنید.</p>
      ${viewPickerMarkup()}
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("download")} نصب برنامه</h2>
      <p class="settings-desc">شیفت‌کار را روی دستگاه خود نصب کنید تا سریع‌تر باز شود و بدون اینترنت هم کار کند.</p>
      <button type="button" class="btn btn-primary" id="install-app-btn">${getInstallState().installed ? "نصب شده" : "نصب برنامه"}</button>
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("help")} راهنما</h2>
      ${HELP_ITEMS.map(
        (h, i) => `
        <details class="help-item">
          <summary>${h.title}</summary>
          <p class="help-body">${h.body.replace(/\n/g, "<br>")}</p>
        </details>`,
      ).join("")}
    </section>

    <section class="settings-card glass-card about-card">
      <h2 class="settings-title">${icon("info")} درباره ما</h2>
      <div class="about-row">
        <img class="about-logo" src="./assets/logo.png?v=2" alt="لوگوی شیفت‌کار" width="72" height="72" />
        <div class="about-text">
          <strong>${APP_INFO.nameFa}</strong>
          <span>${APP_INFO.nameEn} — نسخهٔ ${toPersianDigits(APP_INFO.version)}</span>
          <span>${APP_INFO.tagline}</span>
        </div>
      </div>
      <div class="about-body">
        <p>این نرم‌افزار برای سهولت در برنامه‌ریزی وقت کارکنان شیفت ۱۲ ساعته شاغل در شرکت پتروشیمی بندر امام خمینی (ره) می‌باشد.</p>
        <p>با تشکر و سپاس از تمامی همکاران و دوستانی که با پیشنهادات مفید خود ما را در پیشرفت برنامه یاری نموده‌اند.</p>
        <p>لطفاً انتقادات و پیشنهادات خود را از قسمت «تماس با ما» در میان بگذارید.</p>
      </div>
      <div class="about-credit">
        <span>تهیه شده توسط</span>
        <strong>سید حسین موسوی سعیدی — واحد SBR</strong>
      </div>
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("eitaa")} راه‌های ارتباط با ما</h2>
      <p class="settings-desc">لطفاً انتقادات و پیشنهادات خود را از طریق کانال‌های ارتباطی زیر با ما در میان بگذارید.</p>
      <div class="contact-list" role="list">
        ${CONTACTS.map(
          (c) => `
          <a class="contact-row" href="${c.href}" target="_blank" rel="noopener noreferrer" role="listitem" aria-label="${c.fa}">
            <span class="contact-icon contact-icon-${c.id}">${icon(c.icon)}</span>
            <span class="contact-name">${c.fa}</span>
            <span class="contact-arrow">${icon("external")}</span>
          </a>`,
        ).join("")}
      </div>
    </section>

    <section class="settings-card glass-card">
      <h2 class="settings-title">${icon("refresh")} راهنمای شروع</h2>
      <p class="settings-desc">راهنمای شروع برنامه دوباره نمایش داده می‌شود.</p>
      <button type="button" class="btn btn-ghost btn-danger-ghost" id="restart-onboarding">
        نمایش دوباره راهنما
      </button>
    </section>`;

  wireEvents();
}

function wireEvents() {
  container.querySelectorAll("[data-mygroup]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = btn.dataset.mygroup;
      // Keep the group and the calendar group filter in sync.
      state.set({ myGroup: g, filterGroup: g });
      toast(g === "ALL" ? "نمایش همه گروه‌ها" : `گروه شیفت: ${g}`);
    });
  });

  container.querySelectorAll("[data-thememode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.set({ themeMode: btn.dataset.thememode });
    });
  });

  container.querySelectorAll("[data-theme]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.set({ theme: btn.dataset.theme });
    });
  });

  wireViewPicker(container);

  // Install CTA — keep the label in sync if the install state changes while
  // the settings page is open (e.g. after completing the install).
  if (installStateHandler) window.removeEventListener("shiftkar:install-state", installStateHandler);
  installStateHandler = () => {
    const btn = container.querySelector("#install-app-btn");
    if (!btn) return;
    btn.textContent = getInstallState().installed ? "نصب شده" : "نصب برنامه";
  };
  window.addEventListener("shiftkar:install-state", installStateHandler);

  container.querySelector("#install-app-btn").addEventListener("click", () => {
    if (getInstallState().installed) {
      toast("شیفت‌کار روی دستگاه شما نصب است");
      return;
    }
    showInstallSheet();
  });

  container.querySelector("#restart-onboarding").addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "نمایش دوباره راهنما",
      message: "راهنمای شروع دوباره نمایش داده شود؟ تنظیمات شما حفظ می‌شود.",
      confirmText: "بله",
    });
    if (!ok) return;
    state.set({ onboardingCompleted: false });
    navigate("onboarding");
  });
}
