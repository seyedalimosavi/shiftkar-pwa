/**
 * Guided tour steps.
 *
 * Each step:
 *  - tab:      route to navigate to before looking for the target
 *  - selector: element(s) to spotlight (null → skip targeting, tooltip centered)
 *  - click:    optional action performed before the tooltip shows, e.g. a
 *              button that reveals the element being explained
 *  - title/text: Persian copy for the tooltip bubble
 */
export const TOUR_STEPS = [
  // ---------- bottom navigation ----------
  {
    tab: "calendar",
    selector: "#bottom-nav",
    title: "نوار پایین برنامه",
    text: "چهار بخش اصلی برنامه در این نوار قرار دارد: تقویم، سامانه‌ها، تصویر لوحه و تنظیمات. در ادامه هر کدام را می‌بینید.",
  },
  {
    tab: "calendar",
    selector: '.nav-item[data-route="calendar"]',
    title: "تقویم",
    text: "بخش اصلی برنامه: تقویم ماهانهٔ شیفت‌ها با محاسبهٔ خودکار روزکار، شب‌کاری و استراحت.",
  },
  {
    tab: "systems",
    selector: '.nav-item[data-route="systems"]',
    title: "سامانه‌ها",
    text: "دسترسی سریع به سامانه‌های شرکت پتروشیمی بندر امام خمینی (ره).",
  },
  {
    tab: "roster",
    selector: '.nav-item[data-route="roster"]',
    title: "تصویر لوحه",
    text: "لوحهٔ شیفت همان تصویری است که همیشه در محل کار نصب است؛ اینجا همیشه به‌روز در دسترس شماست.",
  },
  {
    tab: "settings",
    selector: '.nav-item[data-route="settings"]',
    title: "تنظیمات",
    text: "شخصی‌سازی برنامه: گروه شیفت، تم، نمای تقویم و نصب برنامه.",
  },

  // ---------- calendar ----------
  {
    tab: "calendar",
    selector: ".cal-title-btn",
    title: "ماه و سال",
    text: "روی عنوان ماه بزنید تا با تقویم انتخاب ماه، ماه و سال دلخواه را پیدا کنید.",
  },
  {
    tab: "calendar",
    selector: ".cal-nav-start, .cal-nav-end",
    title: "جابه‌جایی بین ماه‌ها",
    text: "با این دو دکمه (فلش‌های دو طرف عنوان ماه) به ماه بعد و قبل بروید. روی «بعدی» بزنید تا ببینید.",
    click: "nextMonth",
  },
  {
    tab: "calendar",
    selector: ".today-chip",
    title: "برو به امروز",
    text: "هر وقت از ماه جاری دور شدید، با این دکمهٔ کوچک یک‌تپه به ماه و روز امروز برمی‌گردید.",
    click: "goToday",
  },
  {
    tab: "calendar",
    selector: ".group-filter",
    title: "فیلتر گروه شیفت",
    text: "گروه شیفت خود (A تا D) را انتخاب کنید؛ «همه» هم وضعیت هر چهار گروه را یک‌جا نشان می‌دهد.",
  },
  {
    tab: "calendar",
    selector: ".cal-body",
    title: "کشیدن انگشت بین ماه‌ها",
    text: "روی همین تقویم، انگشت خود را به راست یا چپ بکشید تا ماه بعد یا قبل را ببینید.",
  },
  {
    tab: "calendar",
    selector: ".view-toggle-nav, .view-single-toggle",
    title: "نمای تقویم و جدول",
    text: "بین نمای شبکه‌ای (تقویم) و جدول شیفت‌ها جابه‌جا شوید.",
    click: "toTable",
  },
  {
    tab: "calendar",
    selector: '[data-action="fullscreen"]',
    title: "جدول تمام‌صفحه",
    text: "با این دکمه جدول شیفت‌ها تمام‌صفحه می‌شود؛ با دکمهٔ بستن یا دکمهٔ بازگشت گوشی، تمام‌صفحه بسته می‌شود.",
    click: "toGrid",
  },

  // ---------- systems ----------
  {
    tab: "systems",
    selector: ".systems-grid",
    title: "سامانه‌های شرکت",
    text: "با یک ضربه، هر سامانه در مرورگر باز می‌شود — پورتال، پنل سفر، سهام فصلی و بقیه.",
  },

  // ---------- roster ----------
  {
    tab: "roster",
    selector: ".roster-preview",
    title: "تصویر لوحهٔ شیفت",
    text: "با ضربه روی تصویر، نمای کامل و بزرگ‌نمایی لوحه باز می‌شود.",
  },

  // ---------- settings ----------
  {
    tab: "settings",
    selector: '[data-mygroup="A"]',
    title: "گروه شخصی شما",
    text: "گروه شیفت خود را اینجا انتخاب کنید تا تقویم از همان ابتدا بر اساس گروه شما باشد.",
  },
  {
    tab: "settings",
    selector: ".theme-grid",
    title: "رنگ اصلی برنامه",
    text: "از بین شش رنگ، رنگ دلخواه خود را انتخاب کنید.",
  },
  {
    tab: "settings",
    selector: "#install-app-btn",
    title: "نصب برنامه",
    text: "شیفت‌کار را روی گوشی یا رایانهٔ خود نصب کنید تا بدون اینترنت هم کار کند و مثل یک اپ واقعی باز شود.",
  },
];
