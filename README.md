# شیفتکار | ShiftKar Web

Persian RTL shift-management and calendar application — a rebuild of the original
Android (Kotlin) app as a **modern Vanilla HTML + CSS + JavaScript Progressive Web App (PWA)**.

No frameworks. No build-time framework magic. Plain ES modules served as static files.

- **Language / direction:** Persian UI, `<html lang="fa" dir="rtl">`, real UTF-8 text
- **Primary target:** mobile (works on tablets and desktop too)
- **Offline:** IndexedDB + LocalStorage + Service Worker

---

## Tech constraints (per spec)

| Use | Do NOT use |
| --- | --- |
| HTML5, CSS3 | React, Vue, Angular, Svelte |
| Vanilla JavaScript (ES Modules) | Next.js, Nuxt, Electron, React Native |
| PWA APIs (manifest, service worker) | any framework-specific architecture |
| IndexedDB, LocalStorage | — |

---

## Project structure

```
shiftkar-web/
│
├── index.html               # RTL app shell (loads CSS + js/app.js)
├── manifest.webmanifest     # PWA manifest (rtl, fa, standalone)
├── service-worker.js        # offline-first caching
│
├── assets/
│   ├── logo.png             # app logo (brand mark from the uploaded icon)
│   ├── roster-1405.png      # roster board photo (uploaded by the owner)
│   └── icons/               # PWA icons (192, 512, maskable, apple-touch)
│
├── css/
│   ├── variables.css        # design tokens, 6 themes via [data-theme]
│   ├── base.css             # reset, typography, RTL foundation
│   ├── components.css       # cards, buttons, badges, sheets, dialogs, nav…
│   ├── calendar.css         # calendar page (grid/list, today card, picker)
│   ├── roster.css           # roster page + full-screen zoom/pan viewer
│   └── responsive.css       # tablet & desktop layouts
│
└── js/
    ├── app.js               # bootstrap: splash → router
    │
    ├── core/                # application state & infrastructure
    │   ├── state.js         # pub/sub store, persisted to LocalStorage
    │   ├── router.js        # hash router (#/calendar, #/roster, …)
    │   └── storage.js       # LocalStorage + IndexedDB (notes) — only gateway
    │
    ├── domain/              # pure business logic (no DOM)
    │   ├── jalali.js        # Jalali ⇄ Gregorian conversion (jalaali-js algorithm)
    │   ├── holidays.js      # holiday dataset (see note below)
    │   ├── shift-calculator.js  # 8-day cycle engine (floorMod, group offsets)
    │   └── models.js        # shared constants / Persian labels
    │
    ├── pages/               # one module per screen
    │   ├── splash.js
    │   ├── onboarding.js
    │   ├── calendar.js
    │   ├── systems.js
    │   ├── roster.js
    │   └── settings.js
    │
    └── components/          # reusable UI
        ├── bottom-nav.js
        ├── bottom-sheet.js
        ├── day-detail.js
        ├── month-picker.js
        ├── shift-badge.js
        ├── notes.js
        ├── dialogs.js       # toast + confirm
        └── icons.js         # shared inline SVG icon set
```

---

## Features

- **Splash → onboarding** (4 intro slides + a personalization slide with live
  group / theme-mode / calendar-view selection, swipe + keyboard, skippable)
- **Themes** — light / dark / follow-system mode (live, follows the OS setting,
  no flash-of-light-theme thanks to a pre-paint boot script) × 6 color palettes,
  all components optimized for dark mode
- **Calendar** — Jalali تقویم (grid) and جدولی (table) views, compact today
  banner, group filter (A–D / all) synced with the Settings personal group,
  month picker, swipe between months, holiday + note indicators, and a
  shift-status legend. The table view opens full-screen with its own month
  navigation; the ALL filter uses filled color-coded group chips
- **«برو به شیفت امروز»** — floating button that appears whenever you're viewing
  a month other than the current one; it jumps back to today's month, selects
  and pulses the today cell, and disappears once you're back in the current month
- **Shift engine** — fixed 8-day cycle `M1 M2 N1 N2 R1 R2 R3 R4`
  (2 days work, 2 nights, 4 rest). Base date `1405/05/04`;
  group offsets `A=7, B=1, C=5, D=3`.
  `cycleIndex = floorMod(daysFromBase + offset, 8)` — correct before AND after
  the base date.
- **Day detail** — Persian/Gregorian dates, weekday, holiday, all four groups'
  shifts, per-day notes
- **Notes** — stored in IndexedDB (offline), note dot on calendar days,
  yellow note card with نمایش بیشتر/کمتر for long notes, and an "all notes"
  sheet with search; tapping a note opens that day scrolled straight to the
  note (ویرایش jumps directly into the editor)
- **Roster (تابلو)** — displays `assets/roster-1405.png` (the real roster
  board photo, already in the repo) with a full-screen zoom/pan viewer
  (pinch, drag, double-tap, wheel, reset).
- **Systems (سامانهها)** — a responsive grid of 8 clearly-labeled example
  systems (حقوق، حضور و غیاب، مرخصی، پورتال، …) that open test URLs in a new
  window (replace with real names/URLs when available)
- **Settings** — personal group (synced with the calendar filter), light/dark/
  system theme + 6 color themes, calendar view (تقویم/جدولی with previews),
  contact options (Telegram, WhatsApp group/private, phone, Eitaa) that open
  the relevant app via test links, help (FA), about, restart onboarding
- **PWA** — manifest (rtl/fa, standalone) + apple-touch/status-bar meta for iOS
  and desktop install; service worker precaches the whole app shell, the roster
  and the icons, then serves everything stale-while-revalidate with an app-shell
  fallback for offline deep links. Settings (LocalStorage) and notes (IndexedDB)
  live on-device, so the app is fully usable with no connection — an «آفلاین»
  banner appears when the network drops.

---

## Data & storage

- **LocalStorage** (`shiftkar.settings.v1`) — settings: theme, personal group,
  filter, calendar view, current month/year, onboarding flag, last screen.
- **IndexedDB** (`shiftkar` db → `notes` store) — per-day notes keyed by
  `1405-05-04` style date keys.
- All raw storage access goes through `js/core/storage.js` only.

## Holidays

`js/domain/holidays.js` ships the **official Iranian holidays** for the years this
build targets (1404, 1405 — the reference year — and 1406), verified against
Iranian calendar references:

- **Fixed solar holidays** — Nowruz (1–4 فروردین), روز جمهوری اسلامی، سیزده‌به‌در،
  رحلت امام خمینی، قیام ۱۵ خرداد، پیروزی انقلاب اسلامی، ملی شدن صنعت نفت.
- **Lunar (Hijri) holidays per year** — عید فطر، قربان، غدیر، تاسوعا و عاشورا،
  اربعین، شهادت‌ها و میلادهای ائمه… (they drift ~11 days earlier each solar
  year, so they are stored year-by-year rather than as fixed dates).

Days are shown red in the calendar/table and the occasion name appears in the
day-detail sheet. For years outside 1404–1406 only the fixed solar holidays apply.

---

## Commands

```bash
bun install            # install deps (Vite dev server only)
bun run dev            # start the Vite dev server
bun tsc -b --noEmit    # typecheck (config covers the JS sources)
node scripts/test-engine.mjs    # Jalali + shift-engine unit tests (86 checks)
node scripts/smoke-import.mjs   # imports every module with DOM shims
node scripts/generate-assets.mjs # regenerate the fallback logo + PWA icons
node scripts/apply-assets.mjs    # resize the uploaded brand icon + copy the roster
```

The dev server registers the service worker only in production builds
(`import.meta.env.DEV` guard in `js/app.js`), so the preview always serves fresh files.

The theme is applied before first paint by a tiny inline script in `index.html`
(reads `themeMode` + `theme` from LocalStorage and sets the `data-theme-mode` /
`data-theme` attributes), so the saved dark/light preference never flashes.

## Removed Android-only features

Per spec, the following are intentionally **not** implemented: home-screen
widgets, notifications / notification scheduling, APK download/install/update,
update checker, dynamic color, and Android intent handling. Updates happen
through normal web deployment.

---

## Brand assets

- The app icon comes from the owner's uploaded mark (`public/assets/icon.png`,
  1024×1024). `node scripts/apply-assets.mjs` decodes it and writes the resized
  PWA icons (192/512/maskable/apple-touch) plus `assets/logo.png` used in the
  splash and About.
- The roster board photo lives at `assets/roster-1405.png` (uploaded JPEG). To
  swap it, replace that file (or `public/assets/roster-1405.png` and re-run
  `apply-assets`); the Roster page picks it up automatically and the service
  worker precaches it for offline use.
