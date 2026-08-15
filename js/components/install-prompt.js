/**
 * PWA install prompt — shared by the onboarding install slide, the Settings
 * install card and the one-time automatic prompt after onboarding.
 *
 *  - Chrome/Android/desktop: captures `beforeinstallprompt` and shows the
 *    native install UI when asked.
 *  - iOS Safari: no install event exists — we show "Add to Home Screen"
 *    instructions instead.
 *  - Already installed (standalone) or after `appinstalled`: reported as
 *    installed and nothing is prompted again.
 */
import { openSheet } from "./bottom-sheet.js";
import { icon } from "./icons.js";
import { toast } from "./dialogs.js";

const FLAG_KEY = "shiftkar.installPrompt.v1";

let deferredPrompt = null;
let installedFlag = false;

/* ---------------- helpers ---------------- */

function loadFlag() {
  try {
    return JSON.parse(localStorage.getItem(FLAG_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFlag(patch) {
  try {
    localStorage.setItem(FLAG_KEY, JSON.stringify({ ...loadFlag(), ...patch }));
  } catch {
    /* storage unavailable — prompt will just show again next visit */
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOSDevice() {
  const ua = navigator.userAgent || "";
  const iPadOS13 = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS13;
}

/** Let every interested UI (onboarding slide, settings card) refresh. */
function emitState() {
  window.dispatchEvent(new CustomEvent("shiftkar:install-state"));
}

/* ---------------- public API ---------------- */

/** Capture the native install event as early as possible (app boot). */
export function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emitState();
  });
  window.addEventListener("appinstalled", () => {
    installedFlag = true;
    deferredPrompt = null;
    saveFlag({ installed: true });
    emitState();
  });
  if (loadFlag().installed) installedFlag = true;
}

/** Current install situation for any UI to render against. */
export function getInstallState() {
  return {
    installed: isStandalone() || installedFlag,
    canPrompt: !!deferredPrompt,
    isIOS: isIOSDevice(),
  };
}

/**
 * Try to install the app.
 * Returns: "installed" | "dismissed" | "instructions" | "unavailable".
 */
export async function promptInstall() {
  const st = getInstallState();
  if (st.installed) return "installed";
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        installedFlag = true;
        saveFlag({ installed: true });
        emitState();
        return "installed";
      }
      return "dismissed";
    } catch {
      return "unavailable";
    }
  }
  if (st.isIOS) return "instructions";
  return "unavailable";
}

/* ---------------- shared markup ---------------- */

const DONE_MARKUP = `
  <div class="install-state install-state-done">
    ${icon("check")} شیفت‌کار روی دستگاه شما نصب است.
  </div>`;

const IOS_STEPS = `
  <ol class="install-steps">
    <li>دکمهٔ اشتراک‌گذاری را در نوار پایین سافاری لمس کنید.</li>
    <li>گزینهٔ «Add to Home Screen» را انتخاب کنید.</li>
    <li>روی «Add» بزنید؛ آیکون شیفت‌کار روی صفحهٔ اصلی قرار می‌گیرد.</li>
  </ol>`;

/** Inline instructions for iOS — reused by the sheet and the onboarding slide. */
export function iosInstructionsHtml() {
  return `
    <div class="install-state install-state-ios">
      <p class="install-desc">در سافاری، دکمهٔ اشتراک‌گذاری را بزنید و «Add to Home Screen» را انتخاب کنید تا شیفت‌کار مثل یک اپ واقعی نصب شود.</p>
      ${IOS_STEPS}
    </div>`;
}

/**
 * Bottom sheet with the install CTA — the single UI used by Settings and by
 * the one-time automatic prompt. Handles every state: installed / native
 * prompt / iOS instructions / unsupported browser.
 */
export function showInstallSheet() {
  const st = getInstallState();

  let body;
  if (st.installed) {
    body = DONE_MARKUP;
  } else if (st.canPrompt) {
    body = `
      <div class="install-sheet">
        <p class="install-desc">شیفت‌کار را به صفحهٔ اصلی دستگاه خود اضافه کنید تا مثل یک اپلیکیشن واقعی، سریع‌تر و حتی بدون اینترنت باز شود.</p>
        <button type="button" class="btn btn-primary btn-block" id="install-sheet-action">
          ${icon("download")} نصب برنامه
        </button>
      </div>`;
  } else if (st.isIOS) {
    body = iosInstructionsHtml();
  } else {
    body = `
      <div class="install-sheet">
        <p class="install-desc">از منوی مرورگر خود گزینهٔ «نصب برنامه» (Install app) را انتخاب کنید تا شیفت‌کار روی دستگاه شما نصب شود.</p>
      </div>`;
  }

  const api = openSheet({
    title: "نصب برنامه",
    content: body,
    onMount: () => {
      const btn = api.body.querySelector("#install-sheet-action");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        const res = await promptInstall();
        if (res === "installed") {
          api.close();
          toast("شیفت‌کار نصب شد");
        } else if (res === "instructions") {
          api.body.innerHTML = iosInstructionsHtml();
        } else if (res === "dismissed") {
          toast("برای نصب، از منوی مرورگر «نصب برنامه» را انتخاب کنید");
        } else {
          toast("مرورگر شما نصب برنامه را پشتیبانی نمی‌کند");
        }
      });
    },
  });
}

/**
 * One-time automatic prompt: fires a short while after the app opens, at most
 * once ever (and never for already-installed users). The sheet itself handles
 * native prompts on Android/desktop and instructions on iOS.
 */
export function maybeAutoPromptInstall() {
  if (getInstallState().installed) return;
  const flag = loadFlag();
  if (flag.autoShown) return;
  saveFlag({ autoShown: true });
  setTimeout(() => showInstallSheet(), 2200);
}
