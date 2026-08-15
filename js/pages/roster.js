/**
 * Roster page («تابلو»).
 * Shows assets/roster-1405.png when present; otherwise a graceful
 * missing-asset state (no fake roster data is generated).
 * The viewer supports zoom, pan, drag, pinch, double-tap and reset.
 */
import { icon } from "../components/icons.js";
import { lockBodyScroll, unlockBodyScroll } from "../components/bottom-sheet.js";

const ROSTER_SRC = "./assets/roster-1405.png";

export function renderRoster(container) {
  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">تابلو</h1>
      <p class="page-subtitle">تصویر تابلو شیفت ۱۴۰۵</p>
    </div>
    <div class="roster-card glass-card" id="roster-card">
      <div class="roster-loading" role="status" aria-label="در حال بارگذاری تابلو">
        <div class="spinner"></div>
        <span>در حال بارگذاری…</span>
      </div>
    </div>`;

  const card = container.querySelector("#roster-card");
  const img = new Image();

  img.onload = () => {
    card.innerHTML = `
      <button type="button" class="roster-preview" aria-label="باز کردن تابلو در نمای کامل">
        <img src="${ROSTER_SRC}" alt="تابلو شیفت ۱۴۰۵" />
        <span class="roster-open-hint">${icon("zoomIn")} برای مشاهدهٔ کامل ضربه بزنید</span>
      </button>`;
    card.querySelector(".roster-preview").addEventListener("click", () => openRosterViewer(ROSTER_SRC));
  };

  img.onerror = () => {
    card.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon("roster")}</div>
        <h2>تصویر تابلو در دسترس نیست</h2>
        <p>فایل <code>assets/roster-1405.png</code> در این نسخه موجود نیست. به محض قرار گرفتن تصویر، از همین بخش نمایش داده می‌شود.</p>
        <button type="button" class="btn btn-primary" id="roster-retry">تلاش دوباره</button>
      </div>`;
    card.querySelector("#roster-retry").addEventListener("click", () => renderRoster(container));
  };

  img.src = ROSTER_SRC;
}

/* ---------------- full-screen viewer ---------------- */

function openRosterViewer(src) {
  const overlay = document.createElement("div");
  overlay.className = "roster-viewer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "نمایش تابلو");
  overlay.innerHTML = `
    <div class="viewer-toolbar">
      <span class="viewer-hint">برای بزرگ‌نمایی دو بار ضربه بزنید</span>
      <div class="viewer-actions">
        <button type="button" class="icon-btn" data-zoom="out" aria-label="کوچک‌نمایی">${icon("zoomOut")}</button>
        <button type="button" class="icon-btn" data-zoom="reset" aria-label="بازنشانی اندازه">${icon("reset")}</button>
        <button type="button" class="icon-btn" data-zoom="in" aria-label="بزرگ‌نمایی">${icon("zoomIn")}</button>
        <button type="button" class="icon-btn viewer-close" aria-label="بستن">${icon("close")}</button>
      </div>
    </div>
    <div class="viewer-stage">
      <img class="viewer-img" src="${src}" alt="تابلو شیفت ۱۴۰۵" draggable="false" />
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  lockBodyScroll();

  const stage = overlay.querySelector(".viewer-stage");
  const img = overlay.querySelector(".viewer-img");

  let scale = 1;
  let tx = 0;
  let ty = 0;
  const pointers = new Map();
  let pinchStart = null;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  const apply = () => {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  // Center the image in the stage (it is absolutely positioned).
  const center = () => {
    if (!img.clientWidth) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    tx = Math.max(0, (sw - img.clientWidth) / 2);
    ty = Math.max(0, (sh - img.clientHeight) / 2);
    apply();
  };
  img.addEventListener("load", center);
  requestAnimationFrame(center);

  const clamp = () => {
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const iw = img.clientWidth * scale;
    const ih = img.clientHeight * scale;
    const maxTx = Math.max(0, (iw - sw) / 2);
    const maxTy = Math.max(0, (ih - sh) / 2);
    tx = Math.min(maxTx, Math.max(-maxTx, tx));
    ty = Math.min(maxTy, Math.max(-maxTy, ty));
  };

  const zoomAt = (next, px = null, py = null) => {
    const rect = stage.getBoundingClientRect();
    const cx = px ?? rect.left + rect.width / 2;
    const cy = py ?? rect.top + rect.height / 2;
    const localX = cx - rect.left;
    const localY = cy - rect.top;
    const clamped = Math.min(4, Math.max(1, next));
    const ratio = clamped / scale;
    tx = localX - (localX - tx) * ratio;
    ty = localY - (localY - ty) * ratio;
    scale = clamped;
    clamp();
    apply();
  };

  const reset = () => {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  };

  stage.addEventListener("pointerdown", (e) => {
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      pinchStart = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y), scale };
      return;
    }

    // double-tap detection (single pointer)
    const now = Date.now();
    if (now - lastTapTime < 300 && Math.abs(e.clientX - lastTapX) < 40 && Math.abs(e.clientY - lastTapY) < 40) {
      zoomAt(scale > 1.01 ? 1 : 2.5, e.clientX, e.clientY);
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;
    lastTapX = e.clientX;
    lastTapY = e.clientY;
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);

    if (pointers.size === 1 && !pinchStart) {
      tx += cur.x - prev.x;
      ty += cur.y - prev.y;
      clamp();
      apply();
    } else if (pointers.size === 2 && pinchStart) {
      const [p1, p2] = [...pointers.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      zoomAt(pinchStart.scale * (dist / pinchStart.dist), midX, midY);
    }
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
  };
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // Wheel zoom (desktop)
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
    },
    { passive: false },
  );

  // Double click (desktop)
  stage.addEventListener("dblclick", (e) => {
    zoomAt(scale > 1.01 ? 1 : 2.5, e.clientX, e.clientY);
  });

  overlay.querySelector('[data-zoom="in"]').addEventListener("click", () => zoomAt(scale * 1.4));
  overlay.querySelector('[data-zoom="out"]').addEventListener("click", () => zoomAt(scale / 1.4));
  overlay.querySelector('[data-zoom="reset"]').addEventListener("click", reset);

  const close = () => {
    if (!overlay.isConnected) return;
    overlay.classList.remove("is-open");
    unlockBodyScroll();
    setTimeout(() => overlay.remove(), 240);
    document.removeEventListener("keydown", onKey);
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);

  overlay.querySelector(".viewer-close").addEventListener("click", close);
}
