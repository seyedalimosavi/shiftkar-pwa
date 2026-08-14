/**
 * Smoke test: imports every app module with minimal DOM shims so that
 * import-path / export-name / top-level wiring errors surface in Node.
 * Run: node scripts/smoke-import.mjs
 */

const el = () =>
  new Proxy(
    {
      children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      style: {},
      dataset: {},
    },
    {
      get(target, prop) {
        if (prop === "classList" || prop === "style" || prop === "dataset") return target[prop];
        if (prop === "addEventListener" || prop === "removeEventListener") return () => {};
        if (prop === "querySelectorAll") return () => [];
        if (prop === "getBoundingClientRect") return () => ({ width: 375, height: 700, left: 0, top: 0 });
        if (
          prop === "querySelector" ||
          prop === "appendChild" ||
          prop === "setAttribute" ||
          prop === "replaceWith" ||
          prop === "remove" ||
          prop === "focus" ||
          prop === "getAttribute"
        )
          return () => (prop === "querySelector" ? el() : undefined);
        return target[prop];
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  );

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.indexedDB = { open: () => ({}) };
globalThis.document = {
  documentElement: { dataset: {} },
  querySelector: () => null,
  createElement: () => el(),
  getElementById: () => el(),
  addEventListener: () => {},
  readyState: "complete",
  body: el(),
};
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.location = { hash: "" };
if (!globalThis.navigator) globalThis.navigator = {};
globalThis.requestAnimationFrame = (fn) => fn && fn();

const mods = [
  "../js/app.js",
  "../js/core/state.js",
  "../js/core/router.js",
  "../js/core/storage.js",
  "../js/domain/jalali.js",
  "../js/domain/holidays.js",
  "../js/domain/shift-calculator.js",
  "../js/domain/models.js",
  "../js/pages/splash.js",
  "../js/pages/onboarding.js",
  "../js/pages/calendar.js",
  "../js/pages/systems.js",
  "../js/pages/roster.js",
  "../js/pages/settings.js",
  "../js/components/icons.js",
  "../js/components/bottom-nav.js",
  "../js/components/bottom-sheet.js",
  "../js/components/day-detail.js",
  "../js/components/month-picker.js",
  "../js/components/shift-badge.js",
  "../js/components/notes.js",
  "../js/components/dialogs.js",
];

for (const m of mods) {
  await import(m);
  console.log("ok", m);
}
console.log("\nAll modules imported cleanly.");
