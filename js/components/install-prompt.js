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
 *  - Uninstall detection: browsers have no "app uninstalled" event, but a
 *    previously-installed PWA that later runs in a normal browser tab
 *    (display-mode ≠ standalone) means the user removed it — we clear the
 *    installed state so the install UI can be offered again.
 */
import { openSheet } from "./bottom-sheet.js";
import { icon } from "./icons.js";
import { toast } from "./dialogs.js";
import { isTourActive } from "./tour.js";

const FLAG_KEY = "shiftkar.installPrompt.v1";

/* Chrome fires `beforeinstallprompt` only after its service worker is
 * ACTIVE. On a cold visit the SW takes a few seconds, so the event can
 * arrive AFTER the user taps نصب برنامه — we wait briefly for it instead
 * of instantly claiming the browser is unsupported. */
const WAIT_FOR_PROMPT_MS = 6000;
let deferredPrompt = null;
let installedFlag = false;
let notifyInstallReady = null;
let autoPromptScheduled = false;
const installReadyPromise = new Promise((resolve) => {
  notifyInstallReady = resolve;
});

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
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
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

/** Chromium browsers (Chrome/Edge/Samsung Internet) support the native
 *  install prompt — if it hasn't fired yet, it's usually just late, not
 *  unsupported. */
function isChromium() {
  const ua = navigator.userAgent || "";
  return !isIOSDevice() && !isFirefox() && /Chrome|Chromium|Edg\//.test(ua);
}

function isFirefoxAndroid() {
  return isFirefox() && /Android/.test(navigator.userAgent || "");
}

/** Let every interested UI (onboarding slide, settings card) refresh. */
function emitState() {
  window.dispatchEvent(new CustomEvent("shiftkar:install-state"));
}

/* ---------------- public API ---------------- */

/**
 * PWA deletion detection (see module docs). Runs once at boot:
 *  - while the app runs standalone, stamp the last standalone time;
 *  - a later browser-tab session with a stale standalone stamp means the
 *    PWA was deleted, so reset the installed state (install UI returns).
 */
function initUninstallDetection() {
  if (isStandalone()) {
    installedFlag = true;
    saveFlag({ lastStandalone: Date.now() });
    return;
  }
  const flag = loadFlag();
  const lastStandalone = flag.lastStandalone || 0;
  const installedByChoice = flag.installed === true;
  if (installedByChoice && lastStandalone > 0 && Date.now() - lastStandalone > 60_000) {
    // The PWA was installed and used, but we're now in a plain browser tab
    // with no standalone session in the last minute → it was deleted.
    // Clear autoShown too so the one-time prompt can fire again.
    saveFlag({ installed: false, lastStandalone: 0, autoShown: false });
    installedFlag = false;
    emitState();
  }
}

/** Capture the native install event as early as possible (app boot). */
export function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emitState();
    notifyInstallReady();
    window.dispatchEvent(new CustomEvent("shiftkar:install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    installedFlag = true;
    deferredPrompt = null;
    saveFlag({ installed: true, lastStandalone: Date.now() });
    emitState();
  });
  if (loadFlag().installed) installedFlag = true;
  initUninstallDetection();
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
 *
 * On Chromium browsers with no prompt in hand yet, waits a few seconds for
 * the late `beforeinstallprompt` (fires only once the service worker is
 * active) before falling back to the manual guide — Chrome is never
 * reported as "unsupported" while it's still preparing installability.
 * While waiting, a `shiftkar:install-waiting` event lets the UI show a
 * busy state on the CTA.
 */
export async function promptInstall() {
  const st = getInstallState();
  if (st.installed) return "installed";

  if (!deferredPrompt && isChromium()) {
    window.dispatchEvent(new CustomEvent("shiftkar:install-waiting"));
    const arrived = await Promise.race([
      installReadyPromise.then(() => true),
      new Promise((r) => setTimeout(() => r(false), WAIT_FOR_PROMPT_MS)),
    ]);
    window.dispatchEvent(new CustomEvent("shiftkar:install-wait-done"));
    if (!arrived || !deferredPrompt) return "instructions";
  }

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

/** Chromium-specific guide: the native prompt just wasn't available at
 *  tap-time (e.g. Chrome's re-offer cooldown after an uninstall) — the
 *  browser CAN install, so point at the menu instead of claiming lack of
 *  support. */
const CHROMIUM_FALLBACK_HTML = `
  <div class="install-state install-state-generic">
    <p class="install-desc">نصب خودکار همین حالا در دسترس نیست؛ اما می‌توانید مستقیم از منوی مرورگر نصب کنید:</p>
    <ol class="install-steps">
      <li>منوی کروم را باز کنید (⋮ در بالای مرورگر).</li>
      <li>روی «نصب برنامه» (Install app) بزنید.</li>
      <li>با تأیید، شیفت‌کار مثل یک اپلیکیشن واقعی نصب می‌شود.</li>
    </ol>
  </div>`;

/** Generic manual guide for browsers without any install support. */
function genericInstructionsHtml() {
  if (isChromium()) return CHROMIUM_FALLBACK_HTML;
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

/** Wire a نصب برنامه CTA: native prompt → done, otherwise the right manual
 *  guide. Shows a busy state while waiting for a late install event. */
function wireInstallCta(btn, api) {
  const setBusy = (busy) => {
    btn.classList.toggle("is-busy", busy);
  };
  btn.addEventListener("click", async () => {
    setBusy(true);
    try {
      const res = await promptInstall();
      if (!api.body.isConnected) return;
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
    } finally {
      setBusy(false);
    }
  });
}

const INSTALL_CTA_MARKUP = `
  <div class="install-sheet">
    <p class="install-desc">شیفت‌کار را به صفحهٔ اصلی دستگاه خود اضافه کنید تا مثل یک اپلیکیشن واقعی، سریع‌تر و حتی بدون اینترنت باز شود.</p>
    <button type="button" class="btn btn-primary btn-block" id="install-sheet-action">
      ${icon("download")} نصب برنامه
    </button>
  </div>`;

/**
 * Bottom sheet with the install CTA — the single UI used by Settings and by
 * the one-time automatic prompt. Handles every state: installed / native
 * prompt / iOS instructions / Firefox instructions / generic manual guide.
 *
 * The CTA is ALWAYS shown first (Chrome fires `beforeinstallprompt` late —
 * a few seconds after first load, once the service worker is ready). If the
 * native prompt is not available when the user taps, the sheet swaps in the
 * manual guide for that exact browser instead of showing a dead end.
 */
export function showInstallSheet() {
  const st = getInstallState();
  const body = st.installed ? DONE_MARKUP : INSTALL_CTA_MARKUP;

  const api = openSheet({
    title: "نصب برنامه",
    content: body,
  });

  // Wire the CTA after openSheet returns — openSheet calls onMount
  // synchronously, so referencing `api` inside onMount would hit the TDZ.
  const installBtn = api.body.querySelector("#install-sheet-action");
  if (installBtn) wireInstallCta(installBtn, api);

  // Chrome may fire `beforeinstallprompt` while the sheet is open (first
  // visit). Re-render the CTA so the tap uses the native prompt instead of
  // the manual guide.
  const onReady = () => {
    if (!api.body.isConnected) return;
    // If the sheet already shows the CTA (or the app is installed), nothing to do.
    if (api.body.querySelector("#install-sheet-action") || getInstallState().installed) return;
    api.body.innerHTML = INSTALL_CTA_MARKUP;
    const btn = api.body.querySelector("#install-sheet-action");
    if (btn) wireInstallCta(btn, api);
  };
  window.addEventListener("shiftkar:install-ready", onReady, { once: true });
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
  if (flag.autoShown || autoPromptScheduled) return;
  // Don't stack the install sheet on top of the first-run guided tour.
  if (isTourActive()) return;
  autoPromptScheduled = true;
  // Give Chrome time to finish service-worker setup and decide
  // installability before we ask — `beforeinstallprompt` only fires after
  // the SW is active, which takes a moment on a cold visit. Re-check the
  // tour: it may have started after this call (tour wins on first run).
  setTimeout(() => {
    if (isTourActive()) return;
    // Consume the one-time flag only when the sheet actually shows — an
    // abandoned session or a tour running at fire-time must not burn it.
    saveFlag({ autoShown: true });
    showInstallSheet();
  }, 4000);
}
