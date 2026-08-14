/**
 * Dialogs: toast notifications and a promise-based confirm dialog.
 */

export function toast(message, { type = "info", duration = 2400 } = {}) {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 320);
  }, duration);
}

export function confirmDialog({ title, message = "", confirmText = "تأیید", cancelText = "انصراف", danger = false }) {
  return new Promise((resolve) => {
    const holder = document.createElement("div");
    holder.innerHTML = `
      <div class="dialog-backdrop">
        <div class="dialog" role="alertdialog" aria-modal="true" aria-label="${title}">
          <h3 class="dialog-title">${title}</h3>
          ${message ? `<p class="dialog-message">${message}</p>` : ""}
          <div class="dialog-actions">
            <button type="button" class="btn btn-ghost dialog-cancel">${cancelText}</button>
            <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"} dialog-ok">${confirmText}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(holder);

    let done = false;
    const finish = (val) => {
      if (done || !holder.isConnected) return;
      done = true;
      document.removeEventListener("keydown", onKey);
      holder.querySelector(".dialog-backdrop").classList.remove("is-open");
      setTimeout(() => holder.remove(), 220);
      resolve(val);
    };

    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => holder.querySelector(".dialog-backdrop").classList.add("is-open"));
    holder.querySelector(".dialog-cancel").addEventListener("click", () => finish(false));
    holder.querySelector(".dialog-ok").addEventListener("click", () => finish(true));
    holder.addEventListener("click", (e) => {
      if (e.target.classList.contains("dialog-backdrop")) finish(false);
    });
  });
}
