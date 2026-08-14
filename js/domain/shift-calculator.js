/**
 * Shift calculation engine.
 *
 * Matches the original Android implementation:
 *  - 8-day cycle: M1 M2 N1 N2 R1 R2 R3 R4
 *  - Base date: 1405/05/04
 *  - Group offsets: A=7, B=1, C=5, D=3
 *  - cycleIndex = floorMod(daysBetween + groupOffset, 8)
 *
 * floorMod is used so dates BEFORE the base date produce correct
 * non-negative indexes (a plain % remainder would produce negatives).
 */
import { toGregorian } from "./jalali.js";

export const SHIFT_CYCLE = ["M1", "M2", "N1", "N2", "R1", "R2", "R3", "R4"];
export const BASE_DATE = { jy: 1405, jm: 5, jd: 4 };
export const GROUP_OFFSETS = { A: 7, B: 1, C: 5, D: 3 };

/** Mathematical floor modulo: always returns a value in [0, n). */
export function floorMod(a, n) {
  return ((a % n) + n) % n;
}

export function getGroupOffset(group) {
  return GROUP_OFFSETS[group] ?? 0;
}

/** Accepts { jy, jm, jd } or a "1405-05-04" date key. */
function normalizeDate(date) {
  if (typeof date === "string") {
    const [jy, jm, jd] = date.split("-").map(Number);
    return { jy, jm, jd };
  }
  return { jy: date.jy, jm: date.jm, jd: date.jd };
}

/** Whole days between the target date and the base date (negative before base). */
export function daysBetweenFromBase(date) {
  const d = normalizeDate(date);
  const baseG = toGregorian(BASE_DATE.jy, BASE_DATE.jm, BASE_DATE.jd);
  const targetG = toGregorian(d.jy, d.jm, d.jd);
  const MS_PER_DAY = 86400000;
  const baseMs = Date.UTC(baseG.gy, baseG.gm - 1, baseG.gd);
  const targetMs = Date.UTC(targetG.gy, targetG.gm - 1, targetG.gd);
  return Math.round((targetMs - baseMs) / MS_PER_DAY);
}

/** Cycle index in [0, 7] for a date + group. */
export function getCycleIndex(date, group) {
  const diff = daysBetweenFromBase(date);
  return floorMod(diff + getGroupOffset(group), SHIFT_CYCLE.length);
}

/** Shift code for a date + group: M1/M2/N1/N2/R1/R2/R3/R4. */
export function getShiftCode(date, group) {
  return SHIFT_CYCLE[getCycleIndex(date, group)];
}

/** User-facing shift type derived from the code: DAY | NIGHT | REST. */
export function getShiftType(code) {
  if (code.startsWith("M")) return "DAY";
  if (code.startsWith("N")) return "NIGHT";
  return "REST";
}

/** Full result: { code, type, group }. */
export function calculateShift(date, group) {
  const code = getShiftCode(date, group);
  return { code, type: getShiftType(code), group };
}

/** Shifts for all four groups on a date. */
export function calculateAllShifts(date) {
  return Object.keys(GROUP_OFFSETS).map((g) => calculateShift(date, g));
}
