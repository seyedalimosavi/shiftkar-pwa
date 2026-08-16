/**
 * Guided tour steps.
 *
 * Each step:
 *  - tab:      route to navigate to before looking for the target
 *  - selector: element to spotlight (null → skip targeting, tooltip centered)
 *  - click:    optional action performed before the tooltip shows, e.g. a
 *              button that reveals the element being explained
 *  - title/text: Persian copy for the tooltip bubble
 */
export const TOUR_STEPS = [
  // ---------- calendar ----------
  {
    tab: "calendar",
    selector: ".cal-title-btn",
    title: "ماه و سال",
    text: "روی عنوان ماه بزنید تا با تقویم انتخاب ماه، ماه و سال دلخواه را پیدا کنید.",
  },
  {
    tab: "calendar",
    selector: '.cal-nav-btn[data-action="next"]',
    title: "جابه‌جایی بین ماه‌ها",
    text: "با این دکمه‌ها یا کشیدن انگشت روی تقویم، به ماه بعد و قبل بروید.",
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
    selector: ".view-toggle-nav",
    title: "نمای تقویم و جدول",
    text: "بین نمای شبکه‌ای (تقویم) و جدول شیفت‌ها جابه‌جا شوید.",
    click: "toTable",
  },
  {
    tab: "calendar",
    selector: '[data-action="fullscreen"]',
    title: "جدول تمام‌صفحه",
    text: "با این دکمه جدول شیفت‌ها تمام‌صفحه می‌شود؛ برای دیدن جزئیات هر روز روی آن بزنید.",
    click: "toGrid",
  },
  // ---------- systems ----------
  {
    tab: "systems",
    selector: ".systems-grid",
    title: "سامانه‌های شرکت",
    text: "دسترسی سریع به سامانه‌های پتروشیمی بندر امام خمینی (ره) — با یک ضربه در مرورگر باز می‌شوند.",
  },
  // ---------- roster ----------
  {
    tab: "roster",
    selector: ".roster-preview",
    title: "تصویر لوحهٔ شیفت",
    text: "لوحهٔ شیفت همان تصویری است که همیشه در محل کار نصب است؛ با ضربه روی آن، تصویر کامل و بزرگ‌نمایی آن باز می‌شود.",
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
    selector: ".theme-mode-grid",
    title: "روشن، تیره یا سیستم",
    text: "حالت نمایش را انتخاب کنید؛ تغییر بلافاصله در کل برنامه اعمال می‌شود.",
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
