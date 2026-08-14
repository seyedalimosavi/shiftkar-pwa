/**
 * Engine tests: Jalali conversion + shift calculation.
 * Run: node scripts/test-engine.mjs
 */
import {
  toJalaali,
  toGregorian,
  isLeapJalaaliYear,
  jalaaliMonthLength,
  jalaaliWeekday,
  makeDateKey,
} from "../js/domain/jalali.js";
import {
  SHIFT_CYCLE,
  BASE_DATE,
  GROUP_OFFSETS,
  floorMod,
  daysBetweenFromBase,
  getCycleIndex,
  getShiftCode,
  getShiftType,
  calculateShift,
  getGroupOffset,
} from "../js/domain/shift-calculator.js";

let failures = 0;
let passed = 0;

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
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

console.log("— Jalali conversions —");

// Known Nowruz dates (well-established)
eq(toJalaali(2020, 3, 20), { jy: 1399, jm: 1, jd: 1 }, "Nowruz 2020 = 1399/01/01");
eq(toJalaali(2021, 3, 21), { jy: 1400, jm: 1, jd: 1 }, "Nowruz 2021 = 1400/01/01");
eq(toJalaali(2022, 3, 21), { jy: 1401, jm: 1, jd: 1 }, "Nowruz 2022 = 1401/01/01");
eq(toJalaali(2023, 3, 21), { jy: 1402, jm: 1, jd: 1 }, "Nowruz 2023 = 1402/01/01");
eq(toJalaali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 }, "Nowruz 2024 = 1403/01/01");
eq(toJalaali(2025, 3, 21), { jy: 1404, jm: 1, jd: 1 }, "Nowruz 2025 = 1404/01/01");
eq(toJalaali(2026, 3, 21), { jy: 1405, jm: 1, jd: 1 }, "Nowruz 2026 = 1405/01/01");
eq(toJalaali(2027, 3, 21), { jy: 1406, jm: 1, jd: 1 }, "Nowruz 2027 = 1406/01/01");

// Spec example: ۱۲ مرداد ۱۴۰۵ = ۳ آگوست ۲۰۲۶
eq(toGregorian(1405, 5, 12), { gy: 2026, gm: 8, gd: 3 }, "1405/05/12 = 2026-08-03");
eq(toJalaali(2026, 8, 3), { jy: 1405, jm: 5, jd: 12 }, "2026-08-03 = 1405/05/12");

// Base date used by the shift engine: 1405/05/04 (Mordad 1 = 2026-07-23)
eq(toGregorian(1405, 5, 4), { gy: 2026, gm: 7, gd: 26 }, "1405/05/04 = 2026-07-26");
eq(toGregorian(1405, 5, 1), { gy: 2026, gm: 7, gd: 23 }, "1405/05/01 = 2026-07-23");

// Month lengths
eq(jalaaliMonthLength(1405, 1), 31, "Farvardin 1405 = 31");
eq(jalaaliMonthLength(1405, 6), 31, "Shahrivar 1405 = 31");
eq(jalaaliMonthLength(1405, 7), 30, "Mehr 1405 = 30");
eq(jalaaliMonthLength(1405, 11), 30, "Bahman 1405 = 30");
eq(jalaaliMonthLength(1405, 12), 29, "Esfand 1405 = 29 (non-leap)");
eq(jalaaliMonthLength(1403, 12), 30, "Esfand 1403 = 30 (leap)");
eq(isLeapJalaaliYear(1403), true, "1403 is a leap year");
eq(isLeapJalaaliYear(1405), false, "1405 is not a leap year");
eq(isLeapJalaaliYear(1399), true, "1399 is a leap year");

// Weekday alignment: Persian week starts Saturday (0 = شنبه)
eq(jalaaliWeekday(1405, 1, 1), 0, "1405/01/01 (2026-03-21) is Saturday (شنبه)");
eq(jalaaliWeekday(1405, 5, 1), 5, "1405/05/01 (2026-07-23) is Thursday (پنجشنبه)");
eq(jalaaliWeekday(1405, 5, 4), 1, "1405/05/04 (2026-07-26) is Sunday (یکشنبه)");
eq(jalaaliWeekday(1405, 5, 12), 2, "1405/05/12 (2026-08-03) is Monday (دوشنبه)");
eq(jalaaliWeekday(1406, 1, 1), 1, "1406/01/01 (2027-03-21) is Sunday (یکشنبه)");

// Round trips
for (const g of [
  [1999, 1, 1], [2000, 2, 29], [2024, 2, 29], [2026, 6, 25], [2035, 12, 31], [1979, 2, 11],
]) {
  const j = toJalaali(...g);
  eq(toGregorian(j.jy, j.jm, j.jd), { gy: g[0], gm: g[1], gd: g[2] }, `roundtrip ${g.join("-")}`);
}

console.log("— Shift engine —");

// Days between
eq(daysBetweenFromBase({ jy: 1405, jm: 5, jd: 4 }), 0, "base date diff = 0");
eq(daysBetweenFromBase({ jy: 1405, jm: 5, jd: 5 }), 1, "one day after base diff = 1");
eq(daysBetweenFromBase({ jy: 1405, jm: 5, jd: 3 }), -1, "one day before base diff = -1");
eq(daysBetweenFromBase({ jy: 1404, jm: 5, jd: 4 }), -365, "one year before base diff = -365");
eq(daysBetweenFromBase({ jy: 1406, jm: 5, jd: 4 }), 365, "one year after base diff = 365");

// floorMod negative handling
eq(floorMod(-1, 8), 7, "floorMod(-1, 8) = 7");
eq(floorMod(-8, 8), 0, "floorMod(-8, 8) = 0");
eq(floorMod(-365, 8), 3, "floorMod(-365, 8) = 3");
eq(floorMod(7, 8), 7, "floorMod(7, 8) = 7");
eq(floorMod(365, 8), 5, "floorMod(365, 8) = 5");

// Cycle is exactly 8 days
eq(SHIFT_CYCLE, ["M1", "M2", "N1", "N2", "R1", "R2", "R3", "R4"], "cycle order");

// Base date: each group's shift (offset applied at day 0)
eq(getShiftCode(BASE_DATE, "A"), "R4", "base date group A = R4");
eq(getShiftCode(BASE_DATE, "B"), "M2", "base date group B = M2");
eq(getShiftCode(BASE_DATE, "C"), "R2", "base date group C = R2");
eq(getShiftCode(BASE_DATE, "D"), "N2", "base date group D = N2");

// One day after base
eq(getShiftCode({ jy: 1405, jm: 5, jd: 5 }, "A"), "M1", "+1d group A = M1 (start of cycle)");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 5 }, "B"), "N1", "+1d group B = N1");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 5 }, "C"), "R3", "+1d group C = R3");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 5 }, "D"), "R1", "+1d group D = R1");

// One day BEFORE base — negative difference (the critical case)
eq(getShiftCode({ jy: 1405, jm: 5, jd: 3 }, "A"), "R3", "-1d group A = R3");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 3 }, "B"), "M1", "-1d group B = M1");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 3 }, "C"), "R1", "-1d group C = R1");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 3 }, "D"), "N1", "-1d group D = N1");

// Far before base: a naive % operator would produce negative indexes here
eq(getShiftCode({ jy: 1405, jm: 5, jd: 2 }, "B"), "R4", "-2d group B = R4 (floorMod required)");
eq(getShiftCode({ jy: 1404, jm: 5, jd: 4 }, "A"), "N1", "-365d group A = N1");
eq(getShiftCode({ jy: 1404, jm: 5, jd: 4 }, "D"), "R3", "-365d group D = R3");

// End of cycle (index 7)
eq(getShiftCode({ jy: 1405, jm: 5, jd: 11 }, "A"), "R3", "+7d group A = R3");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 10 }, "B"), "R4", "+6d group B = R4 (end of cycle)");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 11 }, "B"), "M1", "+7d group B = M1 (8th day starts next cycle)");

// Multiple cycles forward/backward: +8 days repeats, -8 days repeats
eq(getShiftCode({ jy: 1405, jm: 5, jd: 12 }, "A"), "R4", "+8d group A = R4 (cycle repeat)");
eq(getShiftCode({ jy: 1405, jm: 5, jd: 12 }, "B"), "M2", "+8d group B = M2 (cycle repeat)");
eq(getShiftCode({ jy: 1405, jm: 4, jd: 27 }, "A"), "R4", "-8d group A = R4 (cycle repeat)");
eq(getShiftCode({ jy: 1405, jm: 4, jd: 27 }, "D"), "N2", "-8d group D = N2 (cycle repeat)");

// +365 days (one year forward)
eq(getShiftCode({ jy: 1406, jm: 5, jd: 4 }, "A"), "R1", "+365d group A = R1");
eq(getShiftCode({ jy: 1406, jm: 5, jd: 4 }, "C"), "N1", "+365d group C = N1");

// Each group covers the full 8-day cycle exactly once over 8 consecutive days
for (const group of ["A", "B", "C", "D"]) {
  const seen = new Set();
  for (let d = 0; d < 8; d++) {
    const code = getShiftCode({ jy: 1405, jm: 5, jd: 4 + d }, group);
    seen.add(code);
  }
  ok(seen.size === 8, `group ${group} covers all 8 cycle positions`);
  eq(getGroupOffset(group), GROUP_OFFSETS[group], `group ${group} offset`);
}

// getShiftType mapping
eq(getShiftType("M1"), "DAY", "M1 -> DAY");
eq(getShiftType("M2"), "DAY", "M2 -> DAY");
eq(getShiftType("N1"), "NIGHT", "N1 -> NIGHT");
eq(getShiftType("N2"), "NIGHT", "N2 -> NIGHT");
eq(getShiftType("R1"), "REST", "R1 -> REST");
eq(getShiftType("R4"), "REST", "R4 -> REST");

// calculateShift + date key input
eq(calculateShift({ jy: 1405, jm: 5, jd: 4 }, "A"), { code: "R4", type: "REST", group: "A" }, "calculateShift base A");
eq(calculateShift("1405-05-04", "A").code, "R4", "calculateShift accepts date key string");
eq(calculateShift("1405-05-12", "D").type, "NIGHT", "1405/05/12 group D NIGHT (N2)");

// getCycleIndex sanity: full cycle walk for group A starting at base
{
  const indexes = [];
  for (let d = 0; d < 8; d++) indexes.push(getCycleIndex({ jy: 1405, jm: 5, jd: 4 + d }, "A"));
  eq(indexes, [7, 0, 1, 2, 3, 4, 5, 6], "group A cycle index walk");
}

// date key helper
eq(makeDateKey(1405, 5, 4), "1405-05-04", "date key format");

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
