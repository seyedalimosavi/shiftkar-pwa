/**
 * Generates js/domain/events-data.js from scripts/vendor/events.json — the
 * official Iranian events/holiday dataset of the Persian Calendar project
 * (https://github.com/persian-calendar/events), which is itself sourced from
 * the University of Tehran Calendar Center's official calendars.
 *
 * Only Iran (+ IranFormer) events are emitted: ShiftKar is an Iranian app and
 * the other categories (Afghanistan, Nepal, AncientIran, International) are
 * out of scope. "simple" rules become RECURRING_EVENTS (recur every year on
 * their calendar); rule-based entries become IRREGULAR_EVENTS and are
 * resolved at runtime per year.
 *
 * Run: node scripts/generate-events-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(new URL("./vendor/events.json", import.meta.url), "utf8"));
const data = raw.data;

const included = data.filter((e) => e.type === "Iran" || e.type === "IranFormer");

const recurring = [];
const irregular = [];

for (const e of included) {
  const base = {
    calendar: e.calendar,
    title: e.title,
    holiday: e.holiday === true,
    begin: e.metadata?.beginningPersianYear ?? null,
    end: e.metadata?.endingPersianYear ?? null,
  };
  if (e.rule === "simple") {
    recurring.push({ ...base, month: e.month, day: e.day });
  } else {
    const r = { ...base, rule: e.rule };
    if (e.month != null) r.month = e.month;
    if (e.day != null) r.day = e.day;
    if (e.nth != null) r.nth = e.nth;
    if (e.weekday != null) r.weekday = e.weekday;
    if (e.offset != null) r.offset = e.offset;
    if (e.year != null) r.year = e.year;
    irregular.push(r);
  }
}

const out = `/**
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   node scripts/generate-events-data.mjs
 *
 * Official Iranian events & holidays, from the Persian Calendar project's
 * events dataset (https://github.com/persian-calendar/events, events.json),
 * which compiles the official calendars of the University of Tehran Calendar
 * Center (calendar.ut.ac.ir) and other official sources. Only Iran events
 * are included (the app is Iran-focused).
 *
 * Fields:
 *  - calendar: "Persian" | "Hijri" | "Gregorian" (the event's own calendar)
 *  - title: official Persian title
 *  - holiday: true = official public holiday (تعطیل رسمی)
 *  - month/day: fixed date on the event's calendar (recurring events)
 *  - begin/end: Persian-year range the event applies to (null = all years)
 *  - rule (irregular): "single event" | "end of month" |
 *    "last weekday of month" | "nth weekday of month" | "nth day from"
 */
export const RECURRING_EVENTS = ${JSON.stringify(recurring)};
export const IRREGULAR_EVENTS = ${JSON.stringify(irregular)};
`;

writeFileSync(new URL("../js/domain/events-data.js", import.meta.url), out);
console.log(
  `events-data.js written: ${recurring.length} recurring + ${irregular.length} irregular (Iran) events`,
);
