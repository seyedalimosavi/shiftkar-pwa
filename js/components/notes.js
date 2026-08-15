/**
 * Notes UI: per-day note editor (empty / view / edit modes), all-notes list
 * with search, date navigation. Data lives in IndexedDB via core/storage.js.
 */
import { getAllNotes, getNote, putNote, deleteNote } from "../core/storage.js";
import { state } from "../core/state.js";
import { parseDateKey, formatJalali, formatWeekday, toPersianDigits } from "../domain/jalali.js";
import { openSheet } from "./bottom-sheet.js";
import { confirmDialog, toast } from "./dialogs.js";
import { icon } from "./icons.js";

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Hard limit for a note's text (kept short so sheets stay tidy). */
export const NOTE_MAX_LENGTH = 200;

/** Day-detail card shows this many chars before «نمایش بیشتر». */
export const NOTE_VIEW_CLAMP = 140;

/** Table view truncates notes extremely hard so rows stay tidy. */
export const NOTE_TABLE_CLAMP = 22;

function clampText(text, max) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Normalizes Persian/Arabic digits + ZWNJ for search matching. */
function normalizeSearch(s) {
  return s
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/\u200c/g, "")
    .trim()
    .toLowerCase();
}

/** Subtle dot shown on calendar days that have a note. */
export function noteDotMarkup(hasNote) {
  return hasNote ? '<span class="note-dot" title="یادداشت" aria-hidden="true"></span>' : "";
}

export function formatUpdatedAt(iso) {
  const d = new Date(iso);
  const h = toPersianDigits(d.getHours());
  const m = toPersianDigits(String(d.getMinutes()).padStart(2, "0"));
  return `${h}:${m}`;
}

/**
 * Builds the note block for a date:
 *  - empty: a single «افزودن یادداشت» button (no delete button, no form)
 *  - view:  the note on a mild-yellow card with «ویرایش» / «حذف» and
 *           نمایش بیشتر/کمتر for long notes
 *  - edit:  the textarea + ذخیره/انصراف (only while actually editing)
 */
export function createNoteEditor(dateKey, { onSaved = null, startInEdit = false } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "note-editor";
  const inputId = `note-input-${dateKey}`;

  let note = null;
  let mode = "loading"; // loading | empty | view | edit

  const render = () => {
    if (mode === "empty") {
      wrap.innerHTML = `
        <label class="note-editor-label">یادداشت</label>
        <button type="button" class="note-add-btn" id="${inputId}">${icon("note")} افزودن یادداشت</button>`;
      wrap.querySelector(".note-add-btn").addEventListener("click", () => {
        mode = "edit";
        render();
      });
    } else if (mode === "view") {
      const long = note.noteText.length > NOTE_VIEW_CLAMP;
      wrap.innerHTML = `
        <div class="note-view">
          <div class="note-view-text" dir="auto">${escapeHtml(clampText(note.noteText, NOTE_VIEW_CLAMP))}</div>
          ${long ? `<button type="button" class="note-more-btn" data-more>مشاهده بیشتر</button>` : ""}
          <div class="note-view-meta">آخرین ویرایش: ${formatUpdatedAt(note.updatedAt)}</div>
        </div>
        <div class="note-editor-actions">
          <button type="button" class="btn btn-danger-ghost note-delete">حذف</button>
          <button type="button" class="btn btn-primary note-edit-btn">ویرایش</button>
        </div>`;
      const moreBtn = wrap.querySelector("[data-more]");
      if (moreBtn) {
        moreBtn.addEventListener("click", () => {
          const textEl = wrap.querySelector(".note-view-text");
          const expanded = textEl.classList.toggle("is-expanded");
          textEl.textContent = expanded ? note.noteText : clampText(note.noteText, NOTE_VIEW_CLAMP);
          moreBtn.textContent = expanded ? "مشاهده کمتر" : "مشاهده بیشتر";
        });
      }
      wrap.querySelector(".note-edit-btn").addEventListener("click", () => {
        mode = "edit";
        render();
      });
      wrap.querySelector(".note-delete").addEventListener("click", remove);
    } else if (mode === "edit") {
      const value = note ? note.noteText : "";
      wrap.innerHTML = `
        <label class="note-editor-label" for="${inputId}">یادداشت</label>
        <textarea id="${inputId}" class="note-textarea" rows="3" maxlength="${NOTE_MAX_LENGTH}"
          placeholder="یادداشت خود را بنویسید…">${escapeHtml(value)}</textarea>
        <div class="note-editor-meta"><span class="note-count">${toPersianDigits(value.length)} / ${toPersianDigits(NOTE_MAX_LENGTH)}</span></div>
        <div class="note-editor-actions">
          <button type="button" class="btn btn-ghost note-cancel">انصراف</button>
          <button type="button" class="btn btn-primary note-save">ذخیره</button>
        </div>`;
      const textarea = wrap.querySelector(".note-textarea");
      const count = wrap.querySelector(".note-count");
      textarea.addEventListener("input", () => {
        count.textContent = `${toPersianDigits(textarea.value.length)} / ${toPersianDigits(NOTE_MAX_LENGTH)}`;
      });
      wrap.querySelector(".note-cancel").addEventListener("click", () => {
        mode = note ? "view" : "empty";
        render();
      });
      wrap.querySelector(".note-save").addEventListener("click", save);
      textarea.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          save();
        }
      });
      requestAnimationFrame(() => textarea.focus());
    }
  };

  const save = async () => {
    const textarea = wrap.querySelector(".note-textarea");
    const text = textarea.value.trim().slice(0, NOTE_MAX_LENGTH);
    if (!text) {
      toast("متن یادداشت خالی است");
      return;
    }
    const record = await putNote(dateKey, text);
    note = record;
    mode = "view";
    render();
    toast("یادداشت ذخیره شد");
    state.bumpNotes();
    if (onSaved) onSaved();
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: "حذف یادداشت",
      message: "این یادداشت برای همیشه حذف شود؟",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    await deleteNote(dateKey);
    note = null;
    mode = "empty";
    render();
    toast("یادداشت حذف شد");
    state.bumpNotes();
    if (onSaved) onSaved();
  };

  /** Programmatic entry into the editor (all-notes «ویرایش» button). */
  wrap.startEdit = () => {
    mode = "edit";
    render();
  };

  getNote(dateKey).then((n) => {
    note = n || null;
    mode = note ? "view" : "empty";
    if (startInEdit) mode = "edit";
    render();
  });

  return wrap;
}

/** Navigate to a date: switch the calendar month, highlight, open details. */
export function gotoDate(dateKey, opts = {}) {
  const { jy, jm } = parseDateKey(dateKey);
  state.set({ viewYear: jy, viewMonth: jm });
  window.dispatchEvent(new CustomEvent("shiftkar:open-day", { detail: { dateKey, opts } }));
}

/** Shared empty-state markup for the all-notes sheet. */
function emptyStateMarkup() {
  return `
    <div class="empty-state empty-state-compact">
      <div class="empty-icon">${icon("note")}</div>
      <h3>هنوز یادداشتی ندارید</h3>
      <p>روی هر روز در تقویم ضربه بزنید تا یادداشت اضافه کنید.</p>
    </div>`;
}

/** «All notes» sheet: search + jump to each note's date (scrolled to it). */
export async function openAllNotes() {
  const notes = await getAllNotes();

  if (!notes.length) {
    openSheet({
      title: "یادداشت‌های من",
      content: emptyStateMarkup(),
    });
    return;
  }

  const container = document.createElement("div");
  container.className = "notes-manager";
  container.innerHTML = `
    <div class="notes-search">
      ${icon("search")}
      <input type="search" class="notes-search-input" placeholder="جستجو در یادداشت‌ها…" aria-label="جستجو در یادداشت‌ها" autocomplete="off" />
    </div>
    <div class="notes-list" role="list"></div>
    <div class="notes-filter-empty" hidden>یادداشتی با این عبارت پیدا نشد</div>`;

  const listEl = container.querySelector(".notes-list");
  const input = container.querySelector(".notes-search-input");
  const filterEmpty = container.querySelector(".notes-filter-empty");

  const rows = notes.map((note) => {
    const { jy, jm, jd } = parseDateKey(note.dateKey);
    const row = document.createElement("div");
    row.className = "note-list-item";
    row.setAttribute("role", "listitem");
    row.dataset.searchText = normalizeSearch(`${formatJalali(jy, jm, jd)} ${formatWeekday(jy, jm, jd)} ${note.noteText}`);
    row.innerHTML = `
      <button type="button" class="note-list-main" aria-label="باز کردن ${escapeHtml(formatJalali(jy, jm, jd))}">
        <span class="note-list-date">${formatJalali(jy, jm, jd)} <span class="note-list-weekday">${formatWeekday(jy, jm, jd)}</span></span>
        <span class="note-list-text">${escapeHtml(clampText(note.noteText, 60))}</span>
      </button>
      <div class="note-list-actions">
        <button type="button" class="icon-btn note-edit" aria-label="ویرایش یادداشت">${icon("pencil")}</button>
        <button type="button" class="icon-btn note-del" aria-label="حذف یادداشت">${icon("trash")}</button>
      </div>`;

    row.querySelector(".note-list-main").addEventListener("click", () => {
      sheet.close();
      gotoDate(note.dateKey, { focusNote: true });
    });
    row.querySelector(".note-edit").addEventListener("click", () => {
      sheet.close();
      gotoDate(note.dateKey, { focusNote: true, editNote: true });
    });
    row.querySelector(".note-del").addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "حذف یادداشت",
        message: `یادداشت ${formatJalali(jy, jm, jd)} حذف شود؟`,
        confirmText: "حذف",
        danger: true,
      });
      if (!ok) return;
      await deleteNote(note.dateKey);
      state.bumpNotes();
      toast("یادداشت حذف شد");
      rows.splice(rows.indexOf(row), 1);
      row.remove();
      if (!rows.length) {
        container.innerHTML = emptyStateMarkup();
      }
    });

    listEl.appendChild(row);
    return row;
  });

  input.addEventListener("input", () => {
    const q = normalizeSearch(input.value);
    let visible = 0;
    rows.forEach((r) => {
      const match = !q || r.dataset.searchText.includes(q);
      r.hidden = !match;
      if (match) visible += 1;
    });
    filterEmpty.hidden = visible !== 0;
  });

  const sheet = openSheet({ title: "یادداشت‌های من", content: container });
}
