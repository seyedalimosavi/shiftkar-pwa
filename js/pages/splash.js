/**
 * Splash screen — short, professional; app.js navigates away automatically.
 */
import { APP_INFO } from "../domain/models.js";

export function renderSplash(container) {
  container.innerHTML = `
    <div class="splash">
      <div class="splash-inner">
        <img class="splash-logo" src="./assets/logo.png?v=5" alt="لوگوی شیفت‌کار" width="128" height="128" />
        <h1 class="splash-name">${APP_INFO.nameFa}</h1>
        <p class="splash-en">${APP_INFO.nameEn}</p>
        <div class="splash-loader" role="status" aria-label="در حال بارگذاری">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>`;
}
