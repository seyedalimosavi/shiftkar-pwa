/**
 * Storage layer.
 *  - LocalStorage: app settings (JSON under one key).
 *  - IndexedDB: notes (object store keyed by dateKey, e.g. "1405-05-04").
 * No raw localStorage/IndexedDB calls outside this module.
 */

const SETTINGS_KEY = "shiftkar.settings.v1";
const DB_NAME = "shiftkar";
const DB_VERSION = 1;
const NOTES_STORE = "notes";

export const DEFAULT_SETTINGS = {
  theme: "blue",
  themeMode: "system", // "light" | "dark" | "system"
  myGroup: "A",
  filterGroup: "ALL",
  calendarViewType: "grid",
  lastScreenRoute: "calendar",
  onboardingCompleted: false,
  viewYear: 1405,
  viewMonth: 5,
};

/* ---------------- LocalStorage settings ---------------- */

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — keep running in-memory */
  }
}

/* ---------------- IndexedDB notes ---------------- */

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: "dateKey" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Returns the note record { dateKey, noteText, updatedAt } or null. */
export async function getNote(dateKey) {
  const db = await openDB();
  const t = db.transaction(NOTES_STORE, "readonly");
  const result = await requestToPromise(t.objectStore(NOTES_STORE).get(dateKey));
  return result ?? null;
}

/** All notes, newest date first. */
export async function getAllNotes() {
  const db = await openDB();
  const t = db.transaction(NOTES_STORE, "readonly");
  const notes = (await requestToPromise(t.objectStore(NOTES_STORE).getAll())) || [];
  notes.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
  return notes;
}

/** Notes for a specific Jalali month. */
export async function getNotesForMonth(jy, jm) {
  const db = await openDB();
  const mm = String(jm).padStart(2, "0");
  const t = db.transaction(NOTES_STORE, "readonly");
  const range = IDBKeyRange.bound(`${jy}-${mm}-01`, `${jy}-${mm}-31`, false, true);
  const notes = (await requestToPromise(t.objectStore(NOTES_STORE).getAll(range))) || [];
  return notes;
}

/**
 * Save a note for a date. Empty/whitespace text REMOVES the note
 * (per spec: "If a note is saved as empty text, remove the note").
 */
export async function putNote(dateKey, noteText) {
  const trimmed = (noteText || "").trim();
  if (!trimmed) {
    await deleteNote(dateKey);
    return null;
  }
  const db = await openDB();
  const record = { dateKey, noteText: trimmed, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const t = db.transaction(NOTES_STORE, "readwrite");
    t.objectStore(NOTES_STORE).put(record);
    t.oncomplete = () => resolve(record);
    t.onerror = () => reject(t.error);
  });
}

export async function deleteNote(dateKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(NOTES_STORE, "readwrite");
    t.objectStore(NOTES_STORE).delete(dateKey);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
