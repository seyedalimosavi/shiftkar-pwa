/**
 * Guided tour steps.
 *
 * Each step:
 *  - tab:      route to navigate to before looking for the target
 *  - focus:    "soft" (default "strong") — soft keeps the page readable and
 *              only marks the target with the ring; strong blurs + dims
 *              everything except the target. Use soft when the surrounding
 *              content is the subject (tabs, view switch, systems…).
 *  - selector: element(s) to spotlight (null → skip targeting, tooltip centered).
 *              Any selector may match several elements — the spotlight then
 *              covers them ALL (one crisp hole + one ring around the group).
 *  - click:    optional action performed BEFORE the tooltip shows, e.g. a
 *              button that reveals the element being explained
 *  - demo:     optional action performed a moment AFTER the tooltip shows, as
 *              a live demonstration (e.g. «برو به امروز»); the spotlight
 *              re-measures afterwards and fades if the target disappears
 *  - passThrough/swipeArrows: unlock touches to the app for this step (so
 *              the swipe gesture really works) and show floating month
 *              arrow buttons at the sides of the screen
 *  - sheetStep: keep the open bottom sheet (it is the subject of the step);
 *              the engine closes leftover sheets on every other step
 *  - settle:   wait for the target position to stabilise (sheets animate
 *              in) before spotlighting it
 *  - holdTodayChip: pause the «برو به امروز» chip's auto-collapse so the
 *              spotlight stays accurate while teaching it
 *  - installedTitle/installedText: when the install CTA is already satisfied
 *              (app installed), the step swaps in this copy and skips the
 *              spotlight instead of pointing at a pointless button
 *  - title/text: Persian copy for the tooltip bubble
 */
export const TOUR_STEPS = [
  // ---------- bottom navigation ----------
  {
    tab: "calendar",
    focus: "soft",
    selector: ".bottom-nav-inner",
    title: "نوار پایین برنامه",
    text: "چهار بخش اصلی برنامه در این نوار قرار دارد: تقویم، سامانه‌ها، تصویر لوحه و تنظیمات. در ادامه هر کدام را می‌بینید.",
  },
  {
    tab: "calendar",
    focus: "soft",
    selector: '.nav-item[data-route="calendar"]',
    title: "تقویم",
    text: "بخش اصلی برنامه: تقویم ماهانهٔ شیفت‌ها با محاسبهٔ خودکار روزکار، شب‌کاری و استراحت.",
  },
  {
    tab: "systems",
    focus: "soft",
    selector: '.nav-item[data-route="systems"]',
    title: "سامانه‌ها",
    text: "دسترسی سریع به سامانه‌های شرکت پتروشیمی بندر امام خمینی (ره).",
  },
  {
    tab: "roster",
    focus: "soft",
    selector: '.nav-item[data-route="roster"]',
    title: "تصویر لوحه",
    text: "لوحهٔ شیفت همان تصویری است که همیشه در محل کار نصب است؛ اینجا همیشه به‌روز در دسترس شماست.",
  },
  {
    tab: "settings",
    focus: "soft",
    selector: '.nav-item[data-route="settings"]',
    title: "تنظیمات",
    text: "شخصی‌سازی برنامه: گروه شیفت، تم، نمای تقویم و نصب برنامه.",
  },

  // ---------- calendar ----------
  {
    tab: "calendar",
    focus: "soft",
    selector: ".today-banner",
    title: "بنر شیفت امروز",
    text: "در بالای تقویم، تاریخ امروز و شیفت شما (روزکار، شب‌کار یا استراحت) را یک‌جا می‌بینید؛ با ضربه روی آن، جزئیات همان روز باز می‌شود.",
  },
  {
    tab: "calendar",
    focus: "soft",
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
    text: "هر وقت از ماه جاری دور شدید، با این دکمهٔ کوچک یک‌تپه به ماه و روز امروز برمی‌گردید. الان می‌بینیدش!",
    holdTodayChip: true,
    demo: "goToday",
  },
  {
    tab: "calendar",
    selector: ".group-filter",
    title: "فیلتر گروه شیفت",
    text: "گروه شیفت خود (A تا D) را انتخاب کنید؛ «همه» هم وضعیت هر چهار گروه را یک‌جا نشان می‌دهد.",
  },
  {
    tab: "calendar",
    passThrough: true,
    swipeArrows: true,
    selector: ".cal-body",
    title: "کشیدن انگشت بین ماه‌ها",
    text: "همین حالا امتحان کنید: روی تقویم انگشت‌تان را به راست یا چپ بکشید تا ماه عوض شود — یا از فلش‌های دو طرف صفحه استفاده کنید.",
  },
  {
    tab: "calendar",
    focus: "soft",
    selector: ".view-toggle-nav, .view-single-toggle",
    title: "نمای تقویم و جدول",
    text: "بین نمای شبکه‌ای (تقویم) و جدول شیفت‌ها جابه‌جا شوید — الان نمای جدولی را می‌بینید.",
    click: "toTable",
  },
  {
    tab: "calendar",
    focus: "soft",
    selector: '[data-action="fullscreen"]',
    title: "جدول تمام‌صفحه",
    text: "با این دکمه جدول شیفت‌ها تمام‌صفحه می‌شود؛ با دکمهٔ بستن یا دکمهٔ بازگشت گوشی، تمام‌صفحه بسته می‌شود.",
  },

  {
    tab: "calendar",
    focus: "soft",
    sheetStep: true,
    settle: true,
    selector: ".sheet",
    click: "openDay",
    title: "جزئیات هر روز",
    text: "با ضربه روی هر روز، برگهٔ جزئیات باز می‌شود: شیفت همهٔ گروه‌ها، مناسبت‌ها و یادداشت همان روز.",
  },
  {
    tab: "calendar",
    focus: "soft",
    sheetStep: true,
    settle: true,
    selector: ".note-editor",
    title: "یادداشت روزانه",
    text: "برای هر روز می‌توانید یادداشت بگذارید: «افزودن یادداشت» را بزنید، بنویسید و ذخیره کنید.",
  },
  {
    tab: "calendar",
    focus: "soft",
    sheetStep: true,
    settle: true,
    selector: ".sheet",
    click: "openNotes",
    title: "مدیریت همهٔ یادداشت‌ها",
    text: "دکمهٔ یادداشت بالای تقویم، همهٔ یادداشت‌های شما را با جستجو و پرش به همان روز نشان می‌دهد.",
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
    selector: "[data-mygroup]",
    title: "گروه شخصی شما",
    text: "گروه شیفت خود را اینجا انتخاب کنید — همهٔ گزینه‌ها (A تا D و «همه») برای انتخاب باز هستند و تقویم بر اساس گروه شما ساخته می‌شود.",
  },
  {
    tab: "settings",
    selector: ".theme-grid",
    title: "رنگ اصلی برنامه",
    text: "هر شش رنگ برای انتخاب باز است؛ رنگ دلخواه خود را بزنید تا کل برنامه با آن هماهنگ شود.",
  },
  {
    tab: "settings",
    selector: "#install-app-btn",
    title: "نصب برنامه",
    text: "شیفت‌کار را روی گوشی یا رایانهٔ خود نصب کنید تا بدون اینترنت هم کار کند و مثل یک اپ واقعی باز شود.",
    installedTitle: "نصب برنامه",
    installedText: "شیفت‌کار همین حالا روی این دستگاه نصب شده است؛ از فهرست برنامه‌ها بازش کنید تا مثل یک اپ واقعی کار کند — حتی بدون اینترنت.",
  },
];
