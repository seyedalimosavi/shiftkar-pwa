/**
 * Onboarding — 5 slides (4 intro + personalization), horizontal swipe,
 * prev/next/skip, page indicators. Selections on the last slide apply live.
 * Completing sets onboardingCompleted = true (persisted) and enters the app.
 */
import { state } from "../core/state.js";
import { navigate } from "../core/router.js";
import { icon } from "../components/icons.js";
import { GROUP_FILTERS, THEME_MODES } from "../domain/models.js";
import { viewPickerMarkup, wireViewPicker } from "../components/view-picker.js";

const SLIDES = [
  {
    icon: "calendar",
    title: "تقویم هوشمند شیفت",
    desc: "شیفت‌کار بر اساس تاریخ پایه و گروه شما، شیفت روز، شب و استراحت را برای هر روز به‌صورت خودکار محاسبه می‌کند — بدون نیاز به محاسبه دستی.",
  },
  {
    icon: "groups",
    title: "گروه‌های شیفت",
    desc: "هر گروه (A تا D) چرخه شیفت ۸ روزهٔ خودش را دارد. گروه شخصی‌تان را انتخاب کنید تا تقویم بر اساس آن نمایش داده شود؛ در هر لحظه می‌توانید فیلتر همه گروه‌ها را هم ببینید.",
  },
  {
    icon: "note",
    title: "یادداشت‌های شخصی",
    desc: "برای هر روز از تقویم یادداشت اضافه کنید؛ از قرار کاری تا مرخصی. یادداشت‌ها روی دستگاه شما ذخیره می‌شوند و بدون اینترنت هم در دسترس‌اند.",
  },
  {
    icon: "roster",
    title: "تابلو و سامانه‌ها",
    desc: "تصویر تابلو شیفت را با بزرگ‌نمایی و جابه‌جایی مرور کنید و به بخش‌های مرتبط برنامه دسترسی داشته باشید.",
  },
];

const TOTAL_SLIDES = SLIDES.length + 1; // + personalization slide

function personalizeSlideHtml() {
  const s = state.settings;
  return `
    <section class="onboarding-slide onboarding-personalize" role="tabpanel">
      <div class="onboarding-art">${icon("settings", "onboarding-icon")}</div>
      <h2 class="onboarding-title">شخصی‌سازی برنامه</h2>
      <p class="onboarding-desc">گروه شیفت، حالت نمایش و تم را انتخاب کنید؛ تغییرات همین حالا اعمال می‌شود.</p>
      <div class="personalize-form">
        <div class="personalize-field">
          <span class="personalize-label">گروه شیفت</span>
          <div class="segmented" role="group" aria-label="گروه شیفت">
            ${GROUP_FILTERS.map(
              (g) => `
              <button type="button" class="segment ${s.myGroup === g ? "is-active" : ""}" data-mygroup="${g}">${g === "ALL" ? "همه" : g}</button>`,
            ).join("")}
          </div>
        </div>
        <div class="personalize-field">
          <span class="personalize-label">حالت نمایش</span>
          <div class="theme-mode-grid" role="group" aria-label="حالت نمایش">
            ${THEME_MODES.map(
              (m) => `
              <button type="button" class="theme-mode-option ${s.themeMode === m.id ? "is-active" : ""}" data-thememode="${m.id}"
                aria-label="${m.fa}">
                ${icon(m.icon, "theme-mode-icon")}
                <span class="theme-mode-name">${m.fa}</span>
              </button>`,
            ).join("")}
          </div>
        </div>
        <div class="personalize-field">
          <span class="personalize-label">حالت نمایش تقویم</span>
          <div id="onboarding-view-picker">${viewPickerMarkup()}</div>
        </div>
      </div>
    </section>`;
}

export function renderOnboarding(container) {
  let index = 0;

  container.innerHTML = `
    <div class="onboarding">
      <button type="button" class="onboarding-skip">رد شدن</button>
      <div class="onboarding-track-wrap">
        <div class="onboarding-track">
          ${SLIDES.map(
            (s) => `
            <section class="onboarding-slide" role="tabpanel">
              <div class="onboarding-art">${icon(s.icon, "onboarding-icon")}</div>
              <h2 class="onboarding-title">${s.title}</h2>
              <p class="onboarding-desc">${s.desc}</p>
            </section>`,
          ).join("")}
          ${personalizeSlideHtml()}
        </div>
      </div>
      <div class="onboarding-dots" role="tablist" aria-label="مراحل راهنما">
        ${Array.from({ length: TOTAL_SLIDES }, (_, i) => `<button type="button" class="dot" data-index="${i}" aria-label="مرحله ${i + 1}"></button>`).join("")}
      </div>
      <div class="onboarding-actions">
        <button type="button" class="btn btn-ghost onboarding-prev">قبلی</button>
        <button type="button" class="btn btn-primary onboarding-next">بعدی</button>
      </div>
    </div>`;

  const track = container.querySelector(".onboarding-track");
  const dots = container.querySelectorAll(".dot");
  const prevBtn = container.querySelector(".onboarding-prev");
  const nextBtn = container.querySelector(".onboarding-next");
  const skipBtn = container.querySelector(".onboarding-skip");

  function update(animate = true) {
    const width = track.getBoundingClientRect().width || container.clientWidth;
    track.style.transition = animate ? "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)" : "none";
    // Slides are laid out right-to-left; advancing translates the track to
    // the RIGHT, so the incoming slide travels with the direction of the
    // swipe (swipe right = proceed).
    track.style.transform = `translateX(${index * width}px)`;
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === TOTAL_SLIDES - 1 ? "شروع کنید" : "بعدی";
    nextBtn.classList.toggle("is-final", index === TOTAL_SLIDES - 1);
  }

  function complete() {
    state.set({ onboardingCompleted: true });
    // Don't leave onboarding in the back stack: swap it for the calendar
    // entry so a back press after finishing never re-opens the intro.
    try {
      history.replaceState(null, "", "#/calendar");
    } catch (err) {
      /* ignore */
    }
    navigate("calendar");
  }

  prevBtn.addEventListener("click", () => {
    if (index > 0) {
      index -= 1;
      update();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (index < TOTAL_SLIDES - 1) {
      index += 1;
      update();
    } else {
      complete();
    }
  });

  skipBtn.addEventListener("click", complete);

  dots.forEach((d) => {
    d.addEventListener("click", () => {
      index = Number(d.dataset.index);
      update();
    });
  });

  /* ---------------- personalization wiring (live changes) ---------------- */

  container.querySelectorAll("[data-mygroup]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Keep the personal group and the calendar group filter in sync.
      state.set({ myGroup: btn.dataset.mygroup, filterGroup: btn.dataset.mygroup });
      container.querySelectorAll("[data-mygroup]").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
    });
  });

  container.querySelectorAll("[data-thememode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.set({ themeMode: btn.dataset.thememode });
      container.querySelectorAll("[data-thememode]").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
    });
  });

  wireViewPicker(container.querySelector("#onboarding-view-picker"));

  /* ---------------- swipe ---------------- */
  let startX = null;
  let startY = null;
  const wrap = container.querySelector(".onboarding-track-wrap");
  wrap.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );
  wrap.addEventListener(
    "touchend",
    (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx > 0 && index < TOTAL_SLIDES - 1) {
          index += 1;
          update();
        } else if (dx < 0 && index > 0) {
          index -= 1;
          update();
        }
      }
      startX = null;
      startY = null;
    },
    { passive: true },
  );

  // Keyboard (matches the swipe: right = proceed)
  const onKey = (e) => {
    if (e.key === "ArrowRight" && index < TOTAL_SLIDES - 1) {
      index += 1;
      update();
    } else if (e.key === "ArrowLeft" && index > 0) {
      index -= 1;
      update();
    }
  };
  container.addEventListener("keydown", onKey);

  update(false);
  requestAnimationFrame(() => update(true));
}
