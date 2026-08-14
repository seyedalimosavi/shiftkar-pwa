/**
 * Notes UI: per-day note editor, all-notes list, date navigation.
 * Data lives in IndexedDB via core/storage.js.
 */
import { getAllNotes, getNote, putNote, deleteNote } from "../core/storage.js";
import { state } from "../core/state.js";
import { parseDateKey, formatJalali, formatWeekday, toPersianDigits } from "../domain/jalali.js";
import { openSheet } from "./bottom-sheet.js";
import { confirmDialog, toast } from "./dialogs.js";
import { icon } from "./icons.js";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
 * Builds a note editor for a date and wires Save / Delete.
 * Saving an empty text removes the note (per spec).
 */
export function createNoteEditor(dateKey, { onSaved = null } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "note-editor";
  const inputId = `note-input-${dateKey}`;
  wrap.innerHTML = `
    <label class="note-editor-label" for="${inputId}">یادداشت</label>
    <textarea id="${inputId}" class="note-textarea" rows="3" maxlength="2000"
      placeholder="یادداشت خود را بنویسید…"></textarea>
    <div class="note-editor-meta"></div>
    <div class="note-editor-actions">
      <button type="button" class="btn btn-ghost note-delete">حذف</button>
      <button type="button" class="btn btn-primary note-save">ذخیره</button>
    </div>`;

  const textarea = wrap.querySelector(".note-textarea");
  const meta = wrap.querySelector(".note-editor-meta");
  const saveBtn = wrap.querySelector(".note-save");
  const deleteBtn = wrap.querySelector(".note-delete");

  getNote(dateKey).then((note) => {
    if (note) {
      textarea.value = note.noteText;
      wrap.classList.add("has-note");
      meta.textContent = `آخرین ویرایش: ${formatUpdatedAt(note.updatedAt)}`;
    }
  });

  const save = async () => {
    const text = textarea.value.trim();
    if (!text) {
      const ok = await confirmDialog({
        title: "حذف یادداشت",
        message: "متن خالی است. یادداشت این روز حذف شود؟",
        confirmText: "حذف",
        danger: true,
      });
      if (!ok) return;
      await deleteNote(dateKey);
      wrap.classList.remove("has-note");
      meta.textContent = "";
      toast("یادداشت حذف شد");
    } else {
      const record = await putNote(dateKey, text);
      wrap.classList.add("has-note");
      meta.textContent = `آخرین ویرایش: ${formatUpdatedAt(record.updatedAt)}`;
      toast("یادداشت ذخیره شد");
    }
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
    textarea.value = "";
    wrap.classList.remove("has-note");
    meta.textContent = "";
    toast("یادداشت حذف شد");
    state.bumpNotes();
    if (onSaved) onSaved();
  };

  saveBtn.addEventListener("click", save);
  deleteBtn.addEventListener("click", remove);
  textarea.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  });

  return wrap;
}

/** Navigate to a date: switch the calendar month, highlight, open details. */
export function gotoDate(dateKey) {
  const { jy, jm } = parseDateKey(dateKey);
  state.set({ viewYear: jy, viewMonth: jm });
  window.dispatchEvent(new CustomEvent("shiftkar:open-day", { detail: { dateKey } }));
}

/** "All notes" sheet: edit / delete / jump to each note's date. */
export async function openAllNotes() {
  const notes = await getAllNotes();

  if (!notes.length) {
    openSheet({
      title: "یادداشت‌های من",
      content: `
        <div class="empty-state empty-state-compact">
          <div class="empty-icon">${icon("note")}</div>
          <h3>هنوز یادداشتی ندارید</h3>
          <p>روی هر روز در تقویم ضربه بزنید تا یادداشت اضافه کنید.</p>
        </div>`,
    });
    return;
  }

  const list = document.createElement("div");
  list.className = "notes-list";
  list.setAttribute("role", "list");

  for (const note of notes) {
    const { jy, jm, jd } = parseDateKey(note.dateKey);
    const row = document.createElement("div");
    row.className = "note-list-item";
    row.setAttribute("role", "listitem");
    row.innerHTML = `
      <button type="button" class="note-list-main" aria-label="باز کردن ${escapeHtml(formatJalali(jy, jm, jd))}">
        <span class="note-list-date">${formatJalali(jy, jm, jd)} <span class="note-list-weekday">${formatWeekday(jy, jm, jd)}</span></span>
        <span class="note-list-text">${escapeHtml(note.noteText)}</span>
      </button>
      <div class="note-list-actions">
        <button type="button" class="icon-btn note-edit" aria-label="ویرایش یادداشت">${icon("pencil")}</button>
        <button type="button" class="icon-btn note-del" aria-label="حذف یادداشت">${icon("trash")}</button>
      </div>`;

    row.querySelector(".note-list-main").addEventListener("click", () => {
      sheet.close();
      gotoDate(note.dateKey);
    });
    row.querySelector(".note-edit").addEventListener("click", () => {
      sheet.close();
      gotoDate(note.dateKey);
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
      sheet.close();
      openAllNotes();
    });

    list.appendChild(row);
  }

  const sheet = openSheet({ title: "یادداشت‌های من", content: list });
}
