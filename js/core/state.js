/**
 * Central application state.
 * Settings are persisted to LocalStorage; UI subscribes via state.subscribe.
 * Transient UI state (e.g. selected day) lives in state.ui and is NOT persisted.
 */
import { loadSettings, saveSettings } from "./storage.js";
import { THEMES } from "../domain/models.js";

let settings = loadSettings();
const listeners = new Set();
let notesVersion = 0;
let systemListenerAttached = false;

/** Resolves the effective mode: "dark" | "light" (system preference honored). */
function resolveDark() {
  const mode = settings.themeMode || "system";
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = settings.theme || "blue";
  root.dataset.themeMode = resolveDark() ? "dark" : "light";
  const theme = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.color);
}

export const state = {
  /** Persisted settings object (read via state.settings). */
  get settings() {
    return settings;
  },

  /** Transient UI state, not persisted. */
  ui: { selectedDateKey: null },

  get notesVersion() {
    return notesVersion;
  },

  /** Merge a patch into persisted settings and notify subscribers. */
  set(patch) {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    if ("theme" in patch || "themeMode" in patch) applyTheme();
    this.emit();
  },

  /** Update transient UI state and notify subscribers. */
  setUi(patch) {
    Object.assign(this.ui, patch);
    this.emit();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  emit() {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
  },

  /** Notify after notes changed (calendar re-reads note indicators). */
  bumpNotes() {
    notesVersion += 1;
    this.emit();
  },

  applyTheme,
};

export function initState() {
  applyTheme();

  // Follow OS theme changes live while in "system" mode.
  if (!systemListenerAttached && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq && typeof mq.addEventListener === "function") {
      mq.addEventListener("change", () => {
        if ((settings.themeMode || "system") === "system") applyTheme();
      });
      systemListenerAttached = true;
    }
  }
}
