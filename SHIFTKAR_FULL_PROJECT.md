# ShiftKar — Complete Project Rebuild Prompt

## 1. Project Overview

Build a complete, production-ready PWA called **ShiftKar (شیفت‌کار)** — a Persian RTL shift-management and calendar application. This is a **vanilla HTML + CSS + JavaScript** app (no React, no framework, no build step). It uses ES modules, localStorage for settings, IndexedDB for notes, and a service worker for offline support.

The app must work properly on: Mobile phones, Tablets, Desktop browsers, Modern Chromium-based browsers, Modern Firefox, Modern Safari. The primary target is mobile.

## 2. Product Identity

- **Name FA:** شیفت‌کار
- **Name EN:** ShiftKar
- **Version:** ۵.۷.۶
- **Tagline:** تقویم هوشمند شیفت کاری
- **Author:** سید حسین موسوی سعیدی — واحد SBR
- **Company:** پتروشیمی بندر امام خمینی (ره)
- **GA ID:** G-1C1B6LT0DT
- **Contact Phone:** 09163548578
- **Contact Telegram:** https://t.me/h_mosavi_s
- **Contact WhatsApp PV:** https://wa.me/989163548578
- **Contact WhatsApp Group:** https://chat.whatsapp.com/5HolMMoVnojCdh8GjhSZo2
- **Contact Eitaa:** https://eitaa.com/joinchat/929104214C56d88e3e24

## 3. File Structure

```
index.html
manifest.webmanifest
service-worker.js
css/
  variables.css
  base.css
  components.css
  calendar.css
  roster.css
  responsive.css
js/
  app.js
  core/
    state.js
    storage.js
    router.js
    analytics.js
  domain/
    jalali.js
    islamic-calendar.js
    holidays.js
    events-data.js
    models.js
    shift-calculator.js
  components/
    icons.js
    shift-badge.js
    bottom-nav.js
    bottom-sheet.js
    dialogs.js
    day-detail.js
    notes.js
    month-picker.js
    view-picker.js
    install-prompt.js
    tour.js
    tour-steps.js
  pages/
    splash.js
    onboarding.js
    calendar.js
    systems.js
    roster.js
    settings.js
assets/
  logo.png
  icon.png
  roster-1405.png
  icons/
    icon-192.png
    icon-512.png
    icon-maskable-512.png
    apple-touch-icon.png
fonts/
  IRANSansX-Thin.woff2 through IRANSansX-ExtraBlack.woff2
scripts/
  vendor/
    events.json
    qamari-consolidated.txt
    IranianIslamicDateConverter.kt
  generate-events-data.mjs
  generate-assets.mjs
  apply-assets.mjs
  smoke-import.mjs
  test-engine.mjs
  test-holidays.mjs
```

## 4. Architecture

### Routing
- Hash-based router: `#/calendar`, `#/systems`, `#/roster`, `#/settings`, `#/onboarding`
- Splash screen shows for 1 second, then router takes over
- Onboarding guard: until completed, everything routes to onboarding
- Bottom navigation: 4 tabs (تقویم, سامانه‌ها, تصویر لوحه, تنظیمات)

### State Management
- `js/core/state.js`: Central state with `state.settings` (persisted to localStorage), `state.ui` (transient), and `state.subscribe()` for reactive updates
- Settings key: `shiftkar.settings.v1`
- Default settings: theme blue, mode system, group A, filter A, grid view, onboarding not completed, viewYear 1405, viewMonth 5

### Storage
- Settings: localStorage under key `shiftkar.settings.v1`
- Notes: IndexedDB database `shiftkar`, object store `notes` keyed by `dateKey` (format `1405-05-04`)
- Empty note text = delete the note

### Shift Calculation Engine
- 8-day cycle: M1 M2 N1 N2 R1 R2 R3 R4
- Base date: 1405/05/04
- Group offsets: A=7, B=1, C=5, D=3
- `cycleIndex = floorMod(daysBetween + groupOffset, 8)`
- Types: M = DAY (روزکار), N = NIGHT (شبکار), R = REST (استراحت)

### Holiday System
- Data from the Persian Calendar project (persian-calendar/events)
- Three calendars: Persian (solar), Hijri (lunar), Gregorian
- Official Iranian qamari lookup table: Hijri years 1264–1449
- Recurring events (fixed dates on their own calendar)
- Irregular rules: "single event", "end of month", "last weekday of month", "nth weekday of month", "nth day from"
- Year-range filtering: events have begin/end Persian year ranges
- Results memoized per Jalali year

### Key localStorage Keys
- `shiftkar.settings.v1` — app settings
- `shiftkar.tourSeen.v1` — guided tour seen flag
- `shiftkar.installPrompt.v1` — install prompt state
- `shiftkar.gaId.v1` — GA measurement ID override

## 5. Complete Design System (CSS Tokens)

### Font Stack
```css
--font-family: "IRANSansX", "Vazirmatn", "Vazir", "IRANSans", "IRANYekan", "Segoe UI", Tahoma, "Noto Sans Arabic", system-ui, sans-serif;
```
Self-host IRANSansX from fonts/ directory. Load Vazirmatn from Google Fonts as fallback.

### Typography
```css
--fs-xs: 11px; --fs-sm: 13px; --fs-base: 15px; --fs-md: 17px; --fs-lg: 20px; --fs-xl: 24px; --fs-2xl: 30px;
--fw-regular: 400; --fw-medium: 500; --fw-bold: 700; --fw-black: 800;
```

### Spacing & Radii
```css
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;
--radius-sm: 10px; --radius-md: 14px; --radius-lg: 20px; --radius-xl: 26px; --radius-pill: 999px;
```

### Light Mode Base
```css
--color-background: #eef3fb;
--color-surface: rgba(255, 255, 255, 0.6);
--color-surface-strong: rgba(255, 255, 255, 0.86);
--color-surface-solid: #ffffff;
--color-text: #1c2740;
--color-text-muted: #5c6b8c;
--color-text-faint: #8b98b5;
--color-border: rgba(255, 255, 255, 0.72);
--color-border-strong: rgba(141, 160, 200, 0.4);
--glass-blur: 22px;
```

### Six Theme Palettes
Each on `[data-theme="NAME"]`:
- **blue:** #3d6bf5 / #2f56d6 / #e7eeff / #bcd0ff / white / shadow rgba(61,107,245,0.45)
- **emerald:** #0f9d72 / #0b7d5b / #e2f6ee / #b5e6d2 / white / rgba(15,157,114,0.42)
- **purple:** #8b5cf6 / #7443e0 / #f0e9ff / #d5c3fb / white / rgba(139,92,246,0.42)
- **orange:** #f46b16 / #d9550a / #ffede0 / #f9cdb1 / white / rgba(244,107,22,0.42)
- **rose:** #f43f5e / #d92a4b / #ffe9ee / #f9c2cd / white / rgba(244,63,94,0.42)
- **teal:** #0ea5a0 / #0b8581 / #e0f6f4 / #b2e5e1 / white / rgba(14,165,160,0.42)

### Dark Mode
On `[data-theme-mode="dark"]`:
```css
--color-background: #0c1322;
--color-surface: rgba(255, 255, 255, 0.05);
--color-surface-strong: rgba(255, 255, 255, 0.08);
--color-surface-solid: #171f37;
--color-text: #e9eefb;
--color-text-muted: #a4b2cf;
--color-text-faint: #6e7d9d;
--color-border: rgba(255, 255, 255, 0.08);
--color-border-strong: rgba(255, 255, 255, 0.14);
--color-primary-soft: color-mix(in srgb, var(--color-primary) 20%, transparent);
--color-primary-border: color-mix(in srgb, var(--color-primary) 42%, transparent);
```

### Shift Status Colors (consistent across all themes)
```css
--shift-day: #c67a06; --shift-day-soft: #fdf2dc; --shift-day-border: #f2dcae; --shift-day-ink: #8a5604;
--shift-night: #4f46e5; --shift-night-soft: #e9ebff; --shift-night-border: #c9cff8; --shift-night-ink: #3832a8;
--shift-rest: #0f9d72; --shift-rest-soft: #e1f5ed; --shift-rest-border: #b8e6d4; --shift-rest-ink: #0a6d4f;
--holiday: #e11d48; --holiday-soft: #ffe9ee; --holiday-border: #f7c1cd;
--note-bg: #fff6dd; --note-border: #f0dcac; --note-ink: #6d5310;
```

### Glass Card Style
```css
.glass-card {
  background: linear-gradient(150deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5));
  backdrop-filter: blur(22px) saturate(1.4);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.8);
}
```

### Bottom Navigation
- Fixed bottom bar with glassmorphism inner container
- 4 tabs: تقویم (calendar), سامانه‌ها (systems), تصویر لوحه (roster), تنظیمات (settings)
- Active state: primary color text + soft primary background
- Desktop (≥1100px): becomes a vertical sidebar on the right side

### Layout
- Page max-width: 720px (desktop: 860px)
- Safe areas: env(safe-area-inset-top/bottom)
- Nav height: 68px (72px tablet)

## 6. Complete Source Code

### 6.1 index.html
```html
<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="description" content="شیفت‌کار — تقویم هوشمند شیفت کاری با محاسبه خودکار شیفت‌های روز، شب و استراحت" />
  <meta name="theme-color" content="#3d6bf5" />
  <meta name="color-scheme" content="light dark" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="شیفت‌کار" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="icon" type="image/png" href="./assets/icons/icon-192.png" />
  <link rel="apple-touch-icon" href="./assets/icons/apple-touch-icon.png" />
  <script>
    (function () {
      try {
        var raw = localStorage.getItem("shiftkar.settings.v1");
        var s = raw ? JSON.parse(raw) : {};
        var mode = s.themeMode || "system";
        var dark = mode === "dark" || (mode === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.dataset.themeMode = dark ? "dark" : "light";
        if (s.theme) document.documentElement.dataset.theme = s.theme;
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="./css/variables.css" />
  <link rel="stylesheet" href="./css/base.css" />
  <link rel="stylesheet" href="./css/components.css" />
  <link rel="stylesheet" href="./css/calendar.css" />
  <link rel="stylesheet" href="./css/roster.css" />
  <link rel="stylesheet" href="./css/responsive.css" />
  <title>شیفت‌کار | ShiftKar</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

### 6.2 manifest.webmanifest
```json
{
  "name": "شیفت‌کار ShiftKar",
  "short_name": "شیفت‌کار",
  "description": "تقویم هوشمند شیفت کاری — محاسبه خودکار شیفت‌های روز، شب و استراحت",
  "dir": "rtl",
  "lang": "fa",
  "start_url": "./",
  "scope": "./",
  "id": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f7f5ee",
  "theme_color": "#3d6bf5",
  "icons": [
    { "src": "./assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "./assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "./assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 6.3 service-worker.js
```js
const VERSION = "2.0.0";
const CACHE_NAME = `shiftkar-${VERSION}`;
const SHELL = ["./", "./index.html", "./assets/roster-1405.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      const refresh = async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const copy = res.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(req, copy);
          }
          return res;
        } catch { return null; }
      };
      if (req.mode === "navigate") {
        const fresh = await refresh();
        if (fresh) return fresh;
        return cached || (await caches.match("./index.html", { ignoreSearch: true }));
      }
      if (cached) { refresh().catch(() => {}); return cached; }
      return (await refresh()) || (await caches.match("./index.html", { ignoreSearch: true }));
    })(),
  );
});
```

### 6.4 js/app.js — Entry Point
```js
import { initState, state } from "./core/state.js";
import { initRouter, navigate } from "./core/router.js";
import { renderSplash } from "./pages/splash.js";
import { initInstallPrompt } from "./components/install-prompt.js";
import { initAnalytics, trackPageView } from "./core/analytics.js";
import { prefetchRosterImage } from "./pages/roster.js";

const SW_REFRESH_MS = 60 * 60 * 1000;

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const isDev = import.meta.env?.DEV === true;
  if (isDev) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").then((reg) => {
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), SW_REFRESH_MS);
    }).catch((err) => console.warn("Service worker registration failed:", err));
  });
}

function boot() {
  initState();
  initInstallPrompt();
  initAnalytics();
  registerServiceWorker();
  prefetchRosterImage();
  const app = document.getElementById("app");
  renderSplash(app);
  setTimeout(() => {
    initRouter(app);
    const target = state.settings.onboardingCompleted ? "calendar" : "onboarding";
    navigate(target);
    const track = () => trackPageView(window.location.hash.replace(/^#\/?/, "").split("?")[0] || "calendar");
    window.addEventListener("hashchange", track);
    track();
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
```

### 6.5 js/domain/jalali.js — Persian Calendar Conversion
Full Jalali (Persian) calendar conversion. Exports: `toJalaali`, `toGregorian`, `isLeapJalaaliYear`, `jalaaliMonthLength`, `jalaaliWeekday`, `JALALI_MONTHS`, `WEEKDAYS`, `GREGORIAN_MONTHS`, `toPersianDigits`, `pad2`, `makeDateKey`, `parseDateKey`, `formatJalali`, `formatGregorian`, `formatWeekday`, `todayJalaali`, `gregorianWeekdayFa`.

The implementation uses the standard jalaali-js algorithm with BREAKS array, g2d/d2g/j2d/d2j conversions.

### 6.6 js/domain/islamic-calendar.js — Hijri Calendar
Full port of the Persian Calendar project's Islamic calendar. Contains:
- Official Iranian qamari lookup table: `HIJRI_MONTH_BITS` array for Hijri years 1264–1449
- Astronomical new-moon visibility fallback (Makkah parameters)
- Unified API: `islamicToJdn`, `jdnToIslamic`, `islamicMonthLength`, `gregorianToJdn`, `jdnToGregorian`, `weekDayOrdinal`

### 6.7 js/domain/holidays.js — Holiday Engine
Full holiday resolution engine:
- `RECURRING_EVENTS` from events-data.js (Persian, Hijri, Gregorian recurring events)
- `IRREGULAR_EVENTS` from events-data.js (events with rules)
- Per-year resolution: maps each event to its Jalali date(s), filtered by year range
- Memoized per Jalali year in a Map
- Public API: `getDayEvents(jy,jm,jd)`, `getHoliday(jy,jm,jd)`, `isHoliday(jy,jm,jd)`

### 6.8 js/domain/events-data.js — Generated Events Data
Generated by `scripts/generate-events-data.mjs` from the Persian Calendar project's events dataset. Contains:
- `RECURRING_EVENTS`: ~250+ events with calendar, title, holiday flag, month, day, begin/end year ranges
- `IRREGULAR_EVENTS`: ~7 events with resolution rules (single event, end of month, last weekday, nth weekday)

### 6.9 js/domain/models.js — Domain Constants
```js
export const SHIFT_TYPES = {
  DAY: { id: "DAY", fa: "روزکار", badgeClass: "badge-day", icon: "sun" },
  NIGHT: { id: "NIGHT", fa: "شبکار", badgeClass: "badge-night", icon: "moon" },
  REST: { id: "REST", fa: "استراحت", badgeClass: "badge-rest", icon: "rest" },
};
export const SHIFT_CODE_LABELS = { M1: "روزکار", M2: "روزکار", N1: "شبکار", N2: "شبکار", R1: "استراحت", R2: "استراحت", R3: "استراحت", R4: "استراحت" };
export const GROUPS = ["A", "B", "C", "D"];
export const GROUP_FILTERS = ["ALL", "A", "B", "C", "D"];
export const GROUP_FA = { A: "گروه A", B: "گروه B", C: "گروه C", D: "گروه D" };
export const THEMES = [
  { id: "blue", fa: "آبی", color: "#3d6bf5" },
  { id: "emerald", fa: "زمردی", color: "#0f9d72" },
  { id: "purple", fa: "بنفش", color: "#8b5cf6" },
  { id: "orange", fa: "نارنجی", color: "#f46b16" },
  { id: "rose", fa: "رز", color: "#f43f5e" },
  { id: "teal", fa: "فیروزهای", color: "#0ea5a0" },
];
export const THEME_MODES = [
  { id: "light", fa: "روشن", icon: "sun" },
  { id: "dark", fa: "تیره", icon: "moon" },
  { id: "system", fa: "پیروی از سیستم", icon: "settings" },
];
export const APP_INFO = { nameFa: "شیفت‌کار", nameEn: "ShiftKar", version: "5.7.6", tagline: "تقویم هوشمند شیفت کاری" };
```

### 6.10 js/domain/shift-calculator.js — Shift Engine
8-day cycle: `["M1", "M2", "N1", "N2", "R1", "R2", "R3", "R4"]`
Base date: `{ jy: 1405, jm: 5, jd: 4 }`
Group offsets: `{ A: 7, B: 1, C: 5, D: 3 }`
`floorMod(a, n) = ((a % n) + n) % n`
`daysBetweenFromBase(date)` computes whole days between target and base
`getCycleIndex(date, group)` returns index in [0,7]
`getShiftCode(date, group)` returns code string
`getShiftType(code)` returns "DAY"|"NIGHT"|"REST"
`calculateAllShifts(date)` returns all four group shifts

### 6.11 js/core/state.js — Central State
Settings persisted to localStorage. UI state (selectedDateKey) transient. `state.set(patch)` merges into settings, saves, applies theme, emits to subscribers. `state.bumpNotes()` increments notesVersion for calendar refresh. `state.applyTheme()` sets data-theme and data-theme-mode on html element.

### 6.12 js/core/storage.js — Storage Layer
LocalStorage for settings, IndexedDB for notes. Database name: "shiftkar", version 1, object store "notes" with keyPath "dateKey". Exports: `loadSettings`, `saveSettings`, `getNote`, `getAllNotes`, `getNotesForMonth`, `putNote` (empty text = delete), `deleteNote`.

### 6.13 js/core/router.js — Hash Router
Routes: calendar, systems, roster, settings, onboarding, splash. Onboarding guard. Shell routes show bottom nav. Back button handling: non-calendar tabs replace history so back returns to calendar.

### 6.14 js/core/analytics.js — Google Analytics 4
Default Measurement ID: G-1C1B6LT0DT. Override via localStorage key `shiftkar.gaId.v1`. Loads gtag dynamically, fires page_view on route changes.

### 6.15 js/components/icons.js — SVG Icons
Stroke-based inline SVG icons (currentColor). 40+ icons: calendar, systems, roster, settings, chevrons, close, sun, moon, rest, note, grid, list, trash, pencil, info, help, palette, groups, zoomIn, zoomOut, reset, refresh, check, expand, collapse, telegram, whatsapp, eitaa, phone, external, link, copy, holiday, file, briefcase, clipboard, plane, food, chart, globe, download.

### 6.16 js/components/shift-badge.js — Badge Components
`shiftBadge(type, {group, size, showLabel})` — full shift badge
`miniGroupBadge(group, type)` — compact letter chip for ALL view
`shiftCodeBadge(code, {group})` — cycle code badge (R2, M1, etc.)

### 6.17 js/components/bottom-nav.js — Navigation
Four items: calendar (تقویم), systems (سامانه‌ها), roster (تصویر لوحه), settings (تنظیمات). Click navigates to route.

### 6.18 js/components/bottom-sheet.js — Bottom Sheet
Reusable RTL bottom sheet with: swipe-to-dismiss, backdrop close, Escape to close, body scroll lock (counter-based), hardware back button support (history push/pop). `openSheet({title, content, onMount, dismissable, onClose})`. `closeSheetQuietly()` for guided tour use.

### 6.19 js/components/dialogs.js — Dialogs
`toast(message, {type, duration})` — floating toast notification
`confirmDialog({title, message, confirmText, cancelText, danger})` — promise-based confirm dialog

### 6.20 js/components/day-detail.js — Day Detail Sheet
Opens bottom sheet with: Jalali/Gregorian dates, today chip, holiday banner, occasions list, shifts for groups A–D (with "شما" marker for user's group), note editor.

### 6.21 js/components/notes.js — Notes UI
Per-day note editor with three modes: empty (افزودن یادداشت button), view (mild-yellow card with edit/delete/clamp), edit (textarea + save/cancel). All-notes sheet with search and date navigation. Max note length: 200 chars.

### 6.22 js/components/month-picker.js — Month/Year Picker
Bottom sheet with year navigation arrows and 4×3 month grid. Current month highlighted.

### 6.23 js/components/view-picker.js — View Picker
Calendar display mode selector (grid تقویم vs table جدولی) with visual mini-previews. Used in onboarding and Settings.

### 6.24 js/components/install-prompt.js — PWA Install
Handles Chrome/Edge native prompt, iOS Safari instructions, Firefox manual guide, generic manual guide. One-time auto-prompt after 4 seconds. Uninstall detection.

### 6.25 js/components/tour.js — Guided Tour
21-step spotlight-style walkthrough:
- Full-screen overlay with radial gradient mask (SVG hole punches transparent region)
- Glowing ring marks showcased elements
- Tabs switch, actions reveal elements, swipe lesson is pass-through
- Auto-advance on swipe step
- `stepReady` flag disables buttons until spotlight is placed
- `todayChipHold` freezes the today chip during tour
- Saved/restored view preference (grid during tour, restored on finish)
- `markSeen()` on any exit (skip, Escape, or complete)
- Keyboard: Escape to skip, resize re-spots

### 6.26 js/components/tour-steps.js — Tour Step Definitions
21 steps covering:
1. Bottom navigation overview
2. Calendar tab
3. Systems tab
4. Roster tab
5. Settings tab
6. Today banner
7. Month/year picker
8. Month navigation arrows (with click action)
9. "برو به امروز" chip (with demo)
10. Group filter chips
11. Swipe between months (pass-through, auto-advance)
12. View toggle (click: toTable)
13. Fullscreen table button
14. Day detail (click: openDay, sheetStep)
15. Note editor (sheetStep)
16. All notes button
17. Systems grid
18. Roster preview
19. Group selector in settings
20. Theme grid
21. Install button (with installed variant)

### 6.27 js/pages/splash.js — Splash Screen
Shows logo (128px), app name, English name, 3-dot bouncing loader. Renders into #app.

### 6.28 js/pages/onboarding.js — Onboarding
6 slides (4 intro + personalization + install). Horizontal swipe navigation, prev/next/skip buttons, page indicator dots. Personalization slide: group selector, theme mode picker, view picker (all apply live). Install slide with native prompt or manual guide. Keyboard navigation (arrows).

### 6.29 js/pages/calendar.js — Calendar Page (Primary Screen)
- **Today banner**: Glass card with date, shift icon/label, or ALL-group mini-badges
- **Navigation row**: Prev/next arrows, month title (hover capsule), notes button, view toggle, today chip (collapses once per away-session)
- **Group filter row**: "همه" chip + A/B/C/D letter chips (circular badges)
- **Grid view**: 7-column calendar with day numbers, shift badges, holiday highlighting, note dots
- **Table view**: 4-column table (day, weekday, shift, occasion/note)
- **Fullscreen table**: Fixed overlay with its own header, month nav, today FAB, scroll
- **Swipe navigation**: Touch swipe + horizontal wheel/trackpad changes month
- **Notes**: Loads from IndexedDB, cached per month, re-renders on bumpNotes

### 6.30 js/pages/systems.js — Systems Page
2×2 grid (3 columns on tablet) of corporate portal cards. 8 systems: خلاصه پرونده, پرتال, درخواست پرواز, برنامه پروازها, رزرو غذا, سهام, نرم افزار وب, نرم افزار موبایل. Each opens link in new tab.

### 6.31 js/pages/roster.js — Roster Page
Shows `assets/roster-1405.png`. Full-screen viewer with: zoom (pinch, double-tap, buttons, wheel), pan/drag, reset, fit-to-screen. Color legend (red=Fridays, yellow=holidays).

### 6.32 js/pages/settings.js — Settings Page
Sections: Group selector (segmented), Theme mode (light/dark/system), Theme color (6 swatches), View picker, Install button, Help FAQ (7 accordion items), About (logo, version, description), Contact channels (5 links), Restart guide (replay tour + restart onboarding).

## 7. Key Behaviors

### Theme Application
1. User picks theme in onboarding or settings
2. `state.set({theme: "blue"})` saves to localStorage
3. `applyTheme()` sets `document.documentElement.dataset.theme = "blue"` and `dataset.themeMode = "dark"` (or "light")
4. CSS rules on `[data-theme="blue"]` and `[data-theme-mode="dark"]` cascade automatically

### Dark Mode
- System mode: follows `prefers-color-scheme: dark` media query, live-updates
- Dark tokens re-derive soft/border colors from theme primary via `color-mix()`
- Applied via `[data-theme-mode="dark"]` selector

### Note System
- Per-date notes stored in IndexedDB
- Calendar shows note dots on days with notes
- Notes sheet: search, navigate to date, edit, delete
- Empty text = delete note

### Guided Tour
- Auto-starts once after onboarding completes
- 21 steps covering all features
- SVG mask punches transparent hole in overlay
- Glowing ring marks target
- Pass-through for swipe step
- Auto-advance on month change
- Frozen today chip during tour
- Grid view forced during tour, user preference restored on finish
- `markSeen()` on any exit (skip, Escape, or complete)
- Replayable from Settings → راهنمای شروع

### PWA
- Service worker: network-first for navigations, stale-while-revalidate for assets
- Install prompt: Chrome/Edge native, iOS/Firefox/generic manual guides
- One-time auto-prompt after 4 seconds (never during tour)
- Manifest: standalone, portrait, RTL, theme_color

## 8. Scripts (for reference)

### scripts/generate-events-data.mjs
Reads `scripts/vendor/events.json`, filters to Iran events, outputs `js/domain/events-data.js` with RECURRING_EVENTS and IRREGULAR_EVENTS arrays.

### scripts/vendor/events.json
The persian-calendar events dataset (https://github.com/persian-calendar/events).

### scripts/vendor/qamari-consolidated.txt
The official Iranian qamari calendar lookup table from roozbehp/qamari.

## 9. Important Implementation Notes

1. **No build step for the app itself** — pure ES modules loaded by the browser. Vite dev server is used for the Freebuff wrapper only.
2. **RTL throughout** — `html dir="rtl"`, all layouts use RTL-aware CSS.
3. **All text is Persian/Farsi** — every label, button, heading, tooltip is in Persian.
4. **Week starts on Saturday (شنبه)** — Jalali calendar convention.
5. **Shift base date is 1405/05/04** — all calculations relative to this.
6. **The today chip auto-collapses** — once per away-session, with desktop hover re-expansion.
7. **Swipe direction**: RTL convention — swipe RIGHT = next month, LEFT = previous.
8. **The fullscreen table** shares state with the calendar page (same state subscriber).
9. **Notes are limited to 200 characters** — table view clamps to 22 chars.
10. **The tour's SVG mask** is rebuilt from actual viewport coordinates every time the spotlight moves.
