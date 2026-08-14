/**
 * Onboarding — 4 slides, horizontal swipe, prev/next/skip, page indicators.
 * Completing sets onboardingCompleted = true (persisted) and enters the app.
 */
import { state } from "../core/state.js";
import { navigate } from "../core/router.js";
import { icon } from "../components/icons.js";

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
        </div>
      </div>
      <div class="onboarding-dots" role="tablist" aria-label="مراحل راهنما">
        ${SLIDES.map((_, i) => `<button type="button" class="dot" data-index="${i}" aria-label="مرحله ${i + 1}"></button>`).join("")}
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
    track.style.transform = `translateX(${index * width}px)`;
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === SLIDES.length - 1 ? "شروع کنید" : "بعدی";
    if (index === SLIDES.length - 1) {
      nextBtn.classList.add("is-final");
    } else {
      nextBtn.classList.remove("is-final");
    }
  }

  function complete() {
    state.set({ onboardingCompleted: true });
    navigate("calendar");
  }

  prevBtn.addEventListener("click", () => {
    if (index > 0) {
      index -= 1;
      update();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (index < SLIDES.length - 1) {
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

  // Swipe
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
        if (dx < 0 && index < SLIDES.length - 1) {
          index += 1;
          update();
        } else if (dx > 0 && index > 0) {
          index -= 1;
          update();
        }
      }
      startX = null;
      startY = null;
    },
    { passive: true },
  );

  // Keyboard
  const onKey = (e) => {
    if (e.key === "ArrowLeft" && index < SLIDES.length - 1) {
      index += 1;
      update();
    } else if (e.key === "ArrowRight" && index > 0) {
      index -= 1;
      update();
    }
  };
  container.addEventListener("keydown", onKey);

  update(false);
  requestAnimationFrame(() => update(true));
}
