/**
 * PWA install prompt — shared by the onboarding install slide, the Settings
 * install card and the one-time automatic prompt after onboarding.
 *
 *  - Chrome/Edge/Android/desktop: captures `beforeinstallprompt` and shows
 *    the native install UI when asked.
 *  - iOS Safari: no install event exists — we show "Add to Home Screen"
 *    instructions instead.
 *  - Firefox (Android + desktop): `beforeinstallprompt` is not supported,
 *    so instead of a dead "unsupported" state we detect Firefox and show a
 *    short step-by-step guide for adding it manually (home screen on
 *    Android, bookmark/pin on desktop).
 *  - Any other browser without the install event gets the same treatment:
 *    a manual "use your browser menu" guide instead of a plain message.
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

/** Firefox never fires `beforeinstallprompt` — detect it for the manual guide. */
function isFirefox() {
  return /Firefox\//.test(navigator.userAgent || "");
}

function isFirefoxAndroid() {
  return isFirefox() && /Android/.test(navigator.userAgent || "");
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
    isFirefox: isFirefox(),
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
  // No native prompt available (iOS, Firefox, or an unsupported browser) —
  // always hand the user a manual guide instead of a dead end.
  return "instructions";
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

const FIREFOX_ANDROID_STEPS = `
  <ol class="install-steps">
    <li>روی دکمهٔ ⋮ (سه‌نقطه، منو) در نوار پایین فایرفاکس بزنید.</li>
    <li>گزینهٔ «افزودن به صفحهٔ اصلی» (Add to Home screen) را انتخاب کنید.</li>
    <li>روی «افزودن» بزنید؛ آیکون شیفت‌کار روی صفحهٔ اصلی قرار می‌گیرد.</li>
  </ol>`;

const FIREFOX_DESKTOP_STEPS = `
  <ol class="install-steps">
    <li>فایرفاکس دسکتاپ، نصب اپلیکیشن را پشتیبانی نمی‌کند؛ اما می‌توانید تب را به نوار ابزار سنجاق کنید.</li>
    <li>روی ⋮ (منو) بروید و «Pin to Taskbar» (ویندوز) یا «سنجاق به نوار ابزار» را انتخاب کنید.</li>
    <li>می‌توانید شیفت‌کار را هم بوک‌مارک کنید تا با یک کلیک باز شود.</li>
  </ol>`;

/** Inline instructions for Firefox — detected so the user never sees a dead
 *  "unsupported" message. */
export function firefoxInstructionsHtml() {
  return `
    <div class="install-state install-state-firefox">
      <p class="install-desc">فایرفاکس دکمهٔ نصب خودکار ندارد؛ با چند قدم کوتاه، شیفت‌کار را به صفحهٔ اصلی دستگاه اضافه کنید:</p>
      ${isFirefoxAndroid() ? FIREFOX_ANDROID_STEPS : FIREFOX_DESKTOP_STEPS}
    </div>`;
}

const GENERIC_STEPS = `
  <ol class="install-steps">
    <li>منوی مرورگر خود را باز کنید (⋮ یا ⋯).</li>
    <li>دنبال «نصب برنامه» (Install app) یا «افزودن به صفحهٔ اصلی» (Add to Home screen) بگردید.</li>
    <li>با تأیید، آیکون شیفت‌کار روی صفحهٔ اصلی قرار می‌گیرد.</li>
  </ol>`;

/** Generic manual guide for browsers without any install support. */
function genericInstructionsHtml() {
  return `
    <div class="install-state install-state-generic">
      <p class="install-desc">مرورگر شما دکمهٔ نصب خودکار ندارد؛ به‌صورت دستی هم می‌توانید شیفت‌کار را اضافه کنید:</p>
      ${GENERIC_STEPS}
    </div>`;
}

/**
 * The right instructions for THIS browser — iOS / Firefox / anything else.
 * Used by the install sheet and the onboarding slide.
 */
export function tutorialHtml() {
  const st = getInstallState();
  if (st.isIOS) return iosInstructionsHtml();
  if (st.isFirefox) return firefoxInstructionsHtml();
  return genericInstructionsHtml();
}

/**
 * Bottom sheet with the install CTA — the single UI used by Settings and by
 * the one-time automatic prompt. Handles every state: installed / native
 * prompt / iOS instructions / Firefox instructions / generic manual guide.
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
  } else {
    // No native prompt: show the manual guide for this exact browser.
    body = tutorialHtml();
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
          api.body.innerHTML = tutorialHtml();
        } else if (res === "dismissed") {
          toast("برای نصب، از منوی مرورگر «نصب برنامه» را انتخاب کنید");
        } else {
          toast("دوباره تلاش کنید؛ نصب برنامه فعلاً ممکن نشد");
        }
      });
    },
  });
}

/**
 * One-time automatic prompt: fires a short while after the app opens, at most
 * once ever (and never for already-installed users). The sheet itself handles
 * native prompts on Android/desktop and shows the right manual guide on
 * iOS, Firefox and other unsupported browsers.
 */
export function maybeAutoPromptInstall() {
  if (getInstallState().installed) return;
  const flag = loadFlag();
  if (flag.autoShown) return;
  saveFlag({ autoShown: true });
  setTimeout(() => showInstallSheet(), 2200);
}
