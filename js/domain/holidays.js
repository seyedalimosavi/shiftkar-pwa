/**
 * Official Iranian holidays.
 *
 * Three layers, so the calendar shows holidays for EVERY year the user can
 * browse — not just the hand-verified ones:
 *
 * 1. SOLAR_HOLIDAYS — fixed Jalali dates that are official holidays every
 *    year (Nowruz, جمهوری اسلامی، رحلت امام خمینی، قیام ۱۵ خرداد، پیروزی
 *    انقلاب اسلامی، ملی شدن صنعت نفت).
 *
 * 2. YEAR_HOLIDAYS — lunar (Hijri) religious holidays, reference-checked
 *    against Iranian calendar sites (bahesab.ir, time.ir, bani-chap.com)
 *    for the years this build targets (1404–1406; 1405 is the reference
 *    year). These are the ground truth for those years and OVERRIDE the
 *    computed layer, because Iran's official lunar calendar can sit a day
 *    off the Umm al-Qura calendar. More years can be added here anytime.
 *
 * 3. COMPUTED — the same religious holidays derived from the Hijri calendar
 *    for ANY other year, so browsing to 1407 or 1398 still shows every
 *    holiday. Uses the device's Umm al-Qura calendar (astronomical; matches
 *    the real moon-based calendar within a day or so), falling back to the
 *    arithmetic (tabular) Islamic calendar when that locale is unavailable.
 *    If neither is available, the app simply shows the solar + verified
 *    years (the previous behaviour).
 *
 * When a solar and a lunar holiday land on the same day (e.g. عید غدیر and
 * رحلت امام خمینی on ۱۴ خرداد ۱۴۰۵, or نوروز + عید فطر on ۱ فروردین ۱۴۰۵)
 * both names are merged into one entry.
 */
import { toJalaali, toGregorian, jalaaliMonthLength } from "./jalali.js";

export const HOLIDAY_SOURCE_LABEL = "تعطیلات رسمی ایران";

/* ---------- fixed solar holidays (every year) ---------- */
const SOLAR_HOLIDAYS = [
  { jm: 1, jd: 1, name: "نوروز؛ آغاز سال نو" },
  { jm: 1, jd: 2, name: "عید نوروز" },
  { jm: 1, jd: 3, name: "عید نوروز" },
  { jm: 1, jd: 4, name: "عید نوروز" },
  { jm: 1, jd: 12, name: "روز جمهوری اسلامی ایران" },
  { jm: 1, jd: 13, name: "روز طبیعت (سیزده‌به‌در)" },
  { jm: 3, jd: 14, name: "رحلت امام خمینی (ره)" },
  { jm: 3, jd: 15, name: "قیام ۱۵ خرداد" },
  { jm: 11, jd: 22, name: "پیروزی انقلاب اسلامی" },
  { jm: 12, jd: 29, name: "ملی شدن صنعت نفت ایران" },
];

/* ---------- verified lunar holidays (override the computed layer) ---------- */
const YEAR_HOLIDAYS = {
  1404: [
    { jm: 1, jd: 2, name: "شهادت امام علی (ع)" },
    { jm: 1, jd: 11, name: "عید سعید فطر" },
    { jm: 1, jd: 12, name: "تعطیل به مناسبت عید سعید فطر" },
    { jm: 2, jd: 4, name: "شهادت امام جعفر صادق (ع)" },
    { jm: 3, jd: 16, name: "عید سعید قربان" },
    { jm: 3, jd: 24, name: "عید سعید غدیر خم" },
    { jm: 4, jd: 14, name: "تاسوعای حسینی" },
    { jm: 4, jd: 15, name: "عاشورای حسینی" },
    { jm: 5, jd: 23, name: "اربعین حسینی" },
    { jm: 5, jd: 31, name: "رحلت رسول اکرم (ص)؛ شهادت امام حسن مجتبی (ع)" },
    { jm: 6, jd: 2, name: "شهادت امام رضا (ع)" },
    { jm: 6, jd: 10, name: "شهادت امام حسن عسکری (ع)" },
    { jm: 6, jd: 19, name: "میلاد رسول اکرم (ص)؛ میلاد امام جعفر صادق (ع)" },
    { jm: 9, jd: 3, name: "شهادت حضرت فاطمه زهرا (س)" },
    { jm: 10, jd: 13, name: "ولادت امام علی (ع)؛ روز پدر" },
    { jm: 10, jd: 27, name: "مبعث رسول اکرم (ص)" },
    { jm: 11, jd: 15, name: "ولادت امام زمان (عج)" },
    { jm: 12, jd: 20, name: "شهادت امام علی (ع)" },
  ],
  1405: [
    { jm: 1, jd: 1, name: "عید سعید فطر" },
    { jm: 1, jd: 2, name: "تعطیل به مناسبت عید سعید فطر" },
    { jm: 1, jd: 25, name: "شهادت امام جعفر صادق (ع)" },
    { jm: 3, jd: 6, name: "عید سعید قربان" },
    { jm: 3, jd: 14, name: "عید سعید غدیر خم" },
    { jm: 4, jd: 3, name: "تاسوعای حسینی" },
    { jm: 4, jd: 4, name: "عاشورای حسینی" },
    { jm: 5, jd: 13, name: "اربعین حسینی" },
    { jm: 5, jd: 21, name: "رحلت رسول اکرم (ص)؛ شهادت امام حسن مجتبی (ع)" },
    { jm: 5, jd: 22, name: "شهادت امام رضا (ع)" },
    { jm: 5, jd: 30, name: "شهادت امام حسن عسکری (ع)؛ آغاز امامت حضرت ولیعصر (عج)" },
    { jm: 6, jd: 8, name: "میلاد رسول اکرم (ص)؛ میلاد امام جعفر صادق (ع)" },
    { jm: 8, jd: 22, name: "شهادت حضرت فاطمه زهرا (س)" },
    { jm: 10, jd: 2, name: "ولادت امام علی (ع)؛ روز پدر" },
    { jm: 10, jd: 16, name: "مبعث رسول اکرم (ص)" },
    { jm: 11, jd: 4, name: "ولادت امام زمان (عج)" },
    { jm: 12, jd: 9, name: "شهادت امام علی (ع)" },
    { jm: 12, jd: 19, name: "عید سعید فطر" },
    { jm: 12, jd: 20, name: "تعطیل به مناسبت عید سعید فطر" },
  ],
  1406: [
    { jm: 1, jd: 14, name: "شهادت امام جعفر صادق (ع)" },
    { jm: 2, jd: 27, name: "عید سعید قربان" },
    { jm: 3, jd: 4, name: "عید سعید غدیر خم" },
    { jm: 3, jd: 24, name: "تاسوعای حسینی" },
    { jm: 3, jd: 25, name: "عاشورای حسینی" },
    { jm: 5, jd: 3, name: "اربعین حسینی" },
    { jm: 5, jd: 11, name: "رحلت رسول اکرم (ص)؛ شهادت امام حسن مجتبی (ع)" },
    { jm: 5, jd: 13, name: "شهادت امام رضا (ع)" },
    { jm: 5, jd: 20, name: "شهادت امام حسن عسکری (ع)؛ آغاز امامت حضرت ولیعصر (عج)" },
    { jm: 5, jd: 29, name: "میلاد رسول اکرم (ص)؛ میلاد امام جعفر صادق (ع)" },
    { jm: 8, jd: 12, name: "شهادت حضرت فاطمه زهرا (س)" },
    { jm: 9, jd: 21, name: "ولادت امام علی (ع)؛ روز پدر" },
    { jm: 10, jd: 5, name: "مبعث رسول اکرم (ص)" },
    { jm: 10, jd: 23, name: "ولادت امام زمان (عج)" },
    { jm: 11, jd: 28, name: "شهادت امام علی (ع)" },
    { jm: 12, jd: 8, name: "عید سعید فطر" },
    { jm: 12, jd: 9, name: "تعطیل به مناسبت عید سعید فطر" },
  ],
};

/* ---------- lunar holidays at fixed Hijri dates ---------- */
/**
 * hm/hd are Hijri month/day (1 = محرم … 12 = ذی‌الحجه). monthEnd: the date
 * is «the last day of the month» — شهادت امام رضا is ۳۰ صفر, which falls on
 * ۲۹ صفر in years when صفر has only 29 days.
 */
const LUNAR_HOLIDAYS = [
  { hm: 1, hd: 9, name: "تاسوعای حسینی" },
  { hm: 1, hd: 10, name: "عاشورای حسینی" },
  { hm: 2, hd: 20, name: "اربعین حسینی" },
  { hm: 2, hd: 28, name: "رحلت رسول اکرم (ص)؛ شهادت امام حسن مجتبی (ع)" },
  { hm: 2, hd: 30, name: "شهادت امام رضا (ع)", monthEnd: true },
  { hm: 3, hd: 8, name: "شهادت امام حسن عسکری (ع)؛ آغاز امامت حضرت ولیعصر (عج)" },
  { hm: 3, hd: 17, name: "میلاد رسول اکرم (ص)؛ میلاد امام جعفر صادق (ع)" },
  { hm: 6, hd: 3, name: "شهادت حضرت فاطمه زهرا (س)" },
  { hm: 7, hd: 13, name: "ولادت امام علی (ع)؛ روز پدر" },
  { hm: 7, hd: 27, name: "مبعث رسول اکرم (ص)" },
  { hm: 8, hd: 15, name: "ولادت امام زمان (عج)" },
  { hm: 9, hd: 21, name: "شهادت امام علی (ع)" },
  { hm: 10, hd: 1, name: "عید سعید فطر" },
  { hm: 10, hd: 2, name: "تعطیل به مناسبت عید سعید فطر" },
  { hm: 10, hd: 25, name: "شهادت امام جعفر صادق (ع)" },
  { hm: 12, hd: 10, name: "عید سعید قربان" },
  { hm: 12, hd: 18, name: "عید سعید غدیر خم" },
];

/* ---------- Hijri calendar access ---------- */

/** Pick the best Hijri calendar the engine offers: Umm al-Qura (astronomical,
 *  closest to the real moon-based calendar) first, then the arithmetic
 *  (tabular) Islamic calendar. Sanity-check the result — some engines ignore
 *  unknown calendar extensions and silently return the Gregorian date. */
function pickHijriFormatter() {
  for (const cal of ["islamic-umalqura", "islamic"]) {
    try {
      const fmt = new Intl.DateTimeFormat(`en-u-ca-${cal}`, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      });
      const probe = new Date(Date.UTC(2026, 2, 21)); // ۱ فروردین ۱۴۰۵
      const parts = {};
      for (const p of fmt.formatToParts(probe)) parts[p.type] = p.value;
      if (parts.year && parts.year !== String(probe.getUTCFullYear())) return fmt;
    } catch {
      /* try the next calendar */
    }
  }
  return null;
}

const HIJRI_FMT = pickHijriFormatter();

function hijriOfDate(date) {
  const parts = {};
  for (const p of HIJRI_FMT.formatToParts(date)) parts[p.type] = p.value;
  return { hy: Number(parts.year), hm: Number(parts.month), hd: Number(parts.day) };
}

/* ---------- computed lunar holidays for any year ---------- */

const computedCache = new Map();

/**
 * Walks every day of the Jalali year and maps each Hijri date that occurs
 * inside it back to its Jalali (jm, jd). A Jalali year spans ~1.03 Hijri
 * years, so a fixed Hijri date can legitimately occur TWICE in one Jalali
 * year (e.g. both عید فطرs of ۱۴۰۵, at the start and the end of the year) —
 * each occurrence is kept.
 */
function computeLunarYear(jy) {
  const g1 = toGregorian(jy, 1, 1);
  const g2 = toGregorian(jy, 12, jalaaliMonthLength(jy, 12));
  const byHijri = new Map(); // "hy-hm-hd" -> { jm, jd }
  const monthMax = new Map(); // "hy-hm" -> last day of that Hijri month
  let date = new Date(Date.UTC(g1.gy, g1.gm - 1, g1.gd));
  const end = new Date(Date.UTC(g2.gy, g2.gm - 1, g2.gd));

  while (date <= end) {
    const j = toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    if (j.jy === jy) {
      const h = hijriOfDate(date);
      const hk = `${h.hy}-${h.hm}-${h.hd}`;
      if (!byHijri.has(hk)) byHijri.set(hk, { jm: j.jm, jd: j.jd });
      const mk = `${h.hy}-${h.hm}`;
      monthMax.set(mk, Math.max(monthMax.get(mk) || 0, h.hd));
    }
    date = new Date(date.getTime() + 86400000);
  }

  const out = [];
  for (const def of LUNAR_HOLIDAYS) {
    for (const [hk, { jm, jd }] of byHijri) {
      const [hy, hm, hd] = hk.split("-").map(Number);
      if (hm !== def.hm) continue;
      const hit = def.monthEnd ? hd === monthMax.get(`${hy}-${hm}`) : hd === def.hd;
      if (!hit) continue;
      out.push({ jm, jd, name: def.name });
    }
  }
  return out;
}

/** The lunar holiday list for a year: the verified override when one exists,
 *  otherwise the computed Hijri holidays (memoized). */
function lunarYearList(jy) {
  if (YEAR_HOLIDAYS[jy]) return YEAR_HOLIDAYS[jy];
  if (computedCache.has(jy)) return computedCache.get(jy);
  const list = HIJRI_FMT ? computeLunarYear(jy) : [];
  computedCache.set(jy, list);
  return list;
}

/**
 * Returns { name, source: 'official' } when (jy, jm, jd) is an official
 * holiday, otherwise null. Solar + lunar names on the same day are merged.
 */
export function getHoliday(jy, jm, jd) {
  const names = [];
  for (const h of SOLAR_HOLIDAYS) {
    if (h.jm === jm && h.jd === jd) names.push(h.name);
  }
  for (const h of lunarYearList(jy)) {
    if (h.jm === jm && h.jd === jd) names.push(h.name);
  }
  if (!names.length) return null;
  return { name: names.join("، "), source: "official" };
}

export function isHoliday(jy, jm, jd) {
  return getHoliday(jy, jm, jd) !== null;
}
