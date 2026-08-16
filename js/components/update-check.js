/**
 * Silent update experience.
 *
 * Every launch fetches ./updates.json (an easily-editable file next to the
 * manifest) and compares its "version" against the last version this device
 * has seen (localStorage). When a newer version is present:
 *   - a centered "update" dialog shows the changelog and congratulates the
 *     user (they can just continue using the app);
 *   - the version is recorded so it only appears once per update.
 *
 * The very first launch never shows anything — there is no previous version.
 * Offline launches simply skip the check (no error, no dialog).
 */
import { icon } from "./icons.js";
import { toPersianDigits } from "../domain/jalali.js";

const SEEN_KEY = "shiftkar.seenVersion.v1";
const UPDATES_URL = "./updates.json";

let currentVersion = null;
let versionChanged = false;

function loadSeenVersion() {
  try {
    return localStorage.getItem(SEEN_KEY) || "";
  } catch {
    return "";
  }
}

function saveSeenVersion(version) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    /* storage unavailable — dialog may reappear next launch */
  }
}

/** Escapes user-editable text in the JSON so it can't inject HTML. */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showUpdateDialog(info) {
  const versionLabel = toPersianDigits(info.version);
  const list = Array.isArray(info.changelog)
    ? info.changelog
        .map(
          (entry) => `
          <li class="update-changelog-item">
            <span class="update-changelog-dot"></span>
            <div class="update-changelog-body">
              <strong>${esc(entry.title || `نسخهٔ ${versionLabel}`)}</strong>
              ${Array.isArray(entry.changes) && entry.changes.length
                ? `<ul class="update-changelog-list">${entry.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
                : ""}
            </div>
          </li>`
        )
        .join("")
    : "";

  const holder = document.createElement("div");
  holder.innerHTML = `
    <div class="dialog-backdrop update-dialog-backdrop">
      <div class="dialog update-dialog" role="dialog" aria-modal="true" aria-label="به‌روزرسانی">
        <div class="update-dialog-badge">${icon("check")}</div>
        <h3 class="update-dialog-title">${esc(info.message || "نسخهٔ جدید آماده است!")}</h3>
        <p class="update-dialog-sub">${icon("star")} شیفت‌کار به نسخهٔ ${versionLabel} به‌روزرسانی شد.</p>
        ${list ? `<ul class="update-changelog">${list}</ul>` : ""}
        <div class="dialog-actions">
          <button type="button" class="btn btn-primary update-dialog-ok">همین‌طور ادامه بده</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(holder);

  const close = () => {
    if (!holder.isConnected) return;
    holder.querySelector(".dialog-backdrop").classList.remove("is-open");
    setTimeout(() => holder.remove(), 220);
  };
  holder.querySelector(".update-dialog-ok").addEventListener("click", close);
  holder.querySelector(".dialog-backdrop").addEventListener("click", (e) => {
    if (e.target === holder.querySelector(".dialog-backdrop")) close();
  });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", onKey);
      close();
    }
  });
  requestAnimationFrame(() => holder.querySelector(".dialog-backdrop").classList.add("is-open"));
}

/**
 * Check for an update. Called once at boot (and can be called again later).
 * Returns the current version from updates.json (or null when unavailable),
 * so the service-worker banner can stay hidden on first install.
 */
export async function checkForUpdate() {
  let info = null;
  try {
    const res = await fetch(UPDATES_URL, { cache: "no-store" });
    if (res.ok) info = await res.json();
  } catch {
    return null; // offline — skip silently
  }
  if (!info || typeof info.version !== "string") return null;

  const version = info.version;
  currentVersion = version;
  const seen = loadSeenVersion();

  if (!seen) {
    // Very first launch — record the version, never show the dialog.
    saveSeenVersion(version);
    return version;
  }

  if (seen !== version) {
    saveSeenVersion(version);
    versionChanged = true;
    // Only present the dialog after the app is on screen (avoid racing the splash).
    setTimeout(() => showUpdateDialog(info), 350);
  }
  return version;
}

/**
 * For the service-worker update banner:
 *  - false while the updates.json fetch is pending (first install or offline),
 *    so the banner never appears on a first launch;
 *  - false when the changelog dialog already announced this update
 *    (no need for both).
 */
export function hasVersionChanged() {
  if (!currentVersion) return false;
  if (versionChanged) return false;
  return currentVersion !== loadSeenVersion();
}

/** Called once at boot — checks immediately and records the current version. */
export function initUpdateCheck() {
  checkForUpdate();
}
