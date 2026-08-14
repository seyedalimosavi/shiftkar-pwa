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
│   ├── logo.png             # app logo (generated, see scripts/)
│   ├── roster-1405.png      # <optional> roster board photo — drop yours here
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
- **Calendar** — Jalali month grid/list, today card, group filter (A–D / all),
  month picker, swipe between months, holiday + note indicators; the group
  filter and the Settings personal group stay in sync
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
  "all notes" list with edit/delete/jump-to-date
- **Roster (تابلو)** — displays `assets/roster-1405.png` with a full-screen
  zoom/pan viewer (pinch, drag, double-tap, wheel, reset). If the image is not
  present the page shows a graceful missing-data state.
- **Systems (سامانهها)** — external-system links from the Android app are not
  part of this build; the page shows a clear placeholder rather than fake links.
- **Settings** — personal group, 6 color themes, calendar view (grid/list),
  help (FA), about, restart onboarding
- **PWA** — manifest (rtl/fa, standalone), offline caching, installable

---

## Data & storage

- **LocalStorage** (`shiftkar.settings.v1`) — settings: theme, personal group,
  filter, calendar view, current month/year, onboarding flag, last screen.
- **IndexedDB** (`shiftkar` db → `notes` store) — per-day notes keyed by
  `1405-05-04` style date keys.
- All raw storage access goes through `js/core/storage.js` only.

## Holidays

The original Android source ships **no holiday dataset**, so `js/domain/holidays.js`
contains a clearly-labeled **sample (non-official)** set of well-known fixed-date
Iranian holidays. Treat it as a starting point, not an authoritative calendar —
extend `SAMPLE_HOLIDAYS` (and/or add per-year lunar dates) as needed.

---

## Commands

```bash
bun install            # install deps (Vite dev server only)
bun run dev            # start the Vite dev server
bun tsc -b --noEmit    # typecheck (config covers the JS sources)
node scripts/test-engine.mjs    # Jalali + shift-engine unit tests (86 checks)
node scripts/smoke-import.mjs   # imports every module with DOM shims
node scripts/generate-assets.mjs # regenerate logo + PWA icons (pure Node, no deps)
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

## Adding your roster image

Put your real roster board photo at `assets/roster-1405.png` — the Roster page
picks it up automatically (no code change needed) and it is cached for offline
use on first view.
