/**
 * Jalali (Persian) calendar — pure conversion & formatting logic.
 * Based on the standard jalaali-js algorithm. No UI/DOM dependencies.
 */

/* ---------------- low-level helpers ---------------- */

function div(a, b) {
  return Math.trunc(a / b);
}

function mod(a, b) {
  return a - b * Math.floor(a / b);
}

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm;
  let jump;
  let leap;
  let march;
  let n;
  let i;

  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error(`Invalid Jalaali year ${jy}`);

  // Accumulate leap years across each 33-year segment up to jy.
  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm;
  let jd;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

/* ---------------- public API ---------------- */

/** Gregorian (gy, gm, gd) -> Jalali { jy, jm, jd } */
export function toJalaali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

/** Jalali (jy, jm, jd) -> Gregorian { gy, gm, gd } */
export function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

export function isLeapJalaaliYear(jy) {
  return jalCal(jy).leap === 0;
}

export function jalaaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

/** Persian week index: 0 = شنبه (Saturday) ... 6 = جمعه (Friday) */
export function jalaaliWeekday(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  const jsDay = new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 1) % 7;
}

/* ---------------- names & formatting ---------------- */

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سهشنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export const GREGORIAN_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

/** ASCII date key, e.g. "1405-05-04" (lexicographically sortable) */
export function makeDateKey(jy, jm, jd) {
  return `${jy}-${pad2(jm)}-${pad2(jd)}`;
}

export function parseDateKey(key) {
  const [jy, jm, jd] = key.split("-").map(Number);
  return { jy, jm, jd };
}

export function formatJalali(jy, jm, jd) {
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

export function formatGregorian(gy, gm, gd) {
  return `${toPersianDigits(gd)} ${GREGORIAN_MONTHS[gm - 1]} ${toPersianDigits(gy)}`;
}

export function formatWeekday(jy, jm, jd) {
  return WEEKDAYS[jalaaliWeekday(jy, jm, jd)];
}

export function todayJalaali() {
  const now = new Date();
  return toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function gregorianWeekdayFa(gy, gm, gd) {
  const jsDay = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay();
  return ["یکشنبه", "دوشنبه", "سهشنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"][jsDay];
}
