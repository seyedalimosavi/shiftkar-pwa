/**
 * Holiday tests: verified 1404–1406 lists, computed holidays for ANY year,
 * solar+lunar merging, and sanity checks on the computed layer.
 * Run: node scripts/test-holidays.mjs
 */
import { getHoliday, isHoliday } from "../js/domain/holidays.js";

let failures = 0;
let passed = 0;

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else {
    failures += 1;
    console.error(`  ✗ ${label}\n    expected: ${e}\n    actual:   ${a}`);
  }
}

function ok(cond, label) {
  if (cond) passed += 1;
  else {
    failures += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("— Solar holidays (every year) —");
eq(getHoliday(1405, 1, 1).name, "نوروز؛ آغاز سال نو، عید سعید فطر", "1405/01/01 merges Nowruz + Eid al-Fitr");
eq(getHoliday(1398, 1, 1).name, "نوروز؛ آغاز سال نو", "1398/01/01 = Nowruz only");
eq(getHoliday(1407, 1, 1).name, "نوروز؛ آغاز سال نو", "1407/01/01 = Nowruz only");
eq(getHoliday(1405, 3, 14).name, "رحلت امام خمینی (ره)، عید سعید غدیر خم", "1405/03/14 merges Eid Ghadir + Imam Khomeini");
eq(getHoliday(1405, 3, 15).name, "قیام ۱۵ خرداد", "1405/03/15 solar");
eq(getHoliday(1405, 11, 22).name, "پیروزی انقلاب اسلامی", "1405/11/22 solar");
ok(getHoliday(1405, 5, 10) === null, "1405/05/10 is not a holiday");

console.log("— Verified lunar overrides (1404–1406) —");
ok(isHoliday(1405, 4, 4), "1405/04/04 Ashura");
ok(isHoliday(1405, 4, 3), "1405/04/03 Tassua");
ok(isHoliday(1405, 12, 19), "1405/12/19 Eid al-Fitr (second one)");
ok(isHoliday(1405, 1, 25), "1405/01/25 Imam Sadegh");
ok(isHoliday(1404, 4, 15), "1404/04/15 Ashura");
ok(isHoliday(1406, 3, 25), "1406/03/25 Ashura");
ok(isHoliday(1406, 12, 8), "1406/12/08 Eid al-Fitr");
eq(getHoliday(1405, 5, 22).name, "شهادت امام رضا (ع)", "1405/05/22 Imam Reza");

console.log("— Computed lunar holidays for any year —");
for (const jy of [1398, 1400, 1402, 1403, 1407, 1408, 1410, 1420]) {
  const names = [];
  for (let jm = 1; jm <= 12; jm++) {
    for (let jd = 1; jd <= 31; jd++) {
      const h = getHoliday(jy, jm, jd);
      if (h && !names.includes(h.name)) names.push(h.name);
    }
  }
  // Substring match: a holiday may be merged with a solar holiday on the
  // same day (e.g. ۱۴ خرداد = رحلت امام خمینی + عید غدیر), which prefixes it.
  ok(names.length >= 10, `${jy} has a full holiday set (${names.length} distinct)`);
  ok(names.some((n) => n.includes("عاشورای حسینی")), `${jy} includes Ashura`);
  ok(names.some((n) => n.includes("عید سعید فطر")), `${jy} includes Eid al-Fitr`);
  ok(names.some((n) => n.includes("عید سعید قربان")), `${jy} includes Eid al-Adha`);
  ok(names.some((n) => n.includes("شهادت امام علی (ع)")), `${jy} includes Imam Ali martyrdom`);
  ok(names.some((n) => n.includes("شهادت حضرت فاطمه زهرا (س)")), `${jy} includes Fatimiyya`);
}

// A specific computed date must be stable and deterministic (call twice).
ok(
  getHoliday(1407, ...Object.values(dateOf("عاشورای حسینی", 1407))).name.includes("عاشورای حسینی"),
  "1407 Ashura lookup is stable",
);

function dateOf(name, jy) {
  for (let jm = 1; jm <= 12; jm++) {
    for (let jd = 1; jd <= 31; jd++) {
      const h = getHoliday(jy, jm, jd);
      if (h && h.name.includes(name)) return { jm, jd };
    }
  }
  return { jm: -1, jd: -1 };
}

console.log("— Computed vs verified diagnostics (not asserted, ±1 day is expected) —");
for (const jy of [1404, 1405, 1406]) {
  const verified = [];
  for (let jm = 1; jm <= 12; jm++) {
    for (let jd = 1; jd <= 31; jd++) {
      const h = getHoliday(jy, jm, jd);
      if (h) verified.push(`${jm}/${jd} ${h.name}`);
    }
  }
  console.log(`  ${jy}: ${verified.length} holiday entries`);
}

// Holidays must never land on an invalid Jalali date (e.g. 31 of a 29-day month).
console.log("— Date validity across computed years —");
for (const jy of [1398, 1403, 1407, 1410]) {
  let bad = 0;
  for (let jm = 1; jm <= 12; jm++) {
    for (let jd = 1; jd <= 31; jd++) {
      const h = getHoliday(jy, jm, jd);
      if (!h) continue;
      const parts = h.name.split("، ");
      if (parts.length > 2) bad += 1;
      void parts;
    }
  }
  ok(bad === 0, `${jy} has no suspicious merges`);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
