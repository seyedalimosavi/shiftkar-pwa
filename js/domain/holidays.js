/**
 * Holiday data.
 *
 * IMPORTANT: the original Android source for this project does not ship a
 * holiday dataset, so no official list is available here. The list below is
 * an ADDED SAMPLE dataset of well-known fixed-date Iranian holidays
 * (solar/Jalali dates). It is deliberately identified as non-official —
 * do not treat it as a complete or authoritative holiday calendar.
 */
export const HOLIDAY_SOURCE_LABEL = "مجموعه نمونه (غیررسمی)";

const SAMPLE_HOLIDAYS = [
  { jm: 1, jd: 1, name: "نوروز" },
  { jm: 1, jd: 2, name: "نوروز" },
  { jm: 1, jd: 3, name: "نوروز" },
  { jm: 1, jd: 4, name: "نوروز" },
  { jm: 1, jd: 12, name: "روز جمهوری اسلامی" },
  { jm: 1, jd: 13, name: "سیزدهبهدر" },
  { jm: 3, jd: 14, name: "رحلت امام خمینی" },
  { jm: 3, jd: 15, name: "قیام ۱۵ خرداد" },
  { jm: 11, jd: 22, name: "پیروزی انقلاب اسلامی" },
  { jm: 12, jd: 29, name: "ملی شدن صنعت نفت" },
];

/**
 * Returns { name, source: 'sample' } when (jm, jd) is a known holiday,
 * otherwise null. The year is ignored (solar fixed-date holidays repeat
 * every year).
 */
export function getHoliday(jy, jm, jd) {
  for (const h of SAMPLE_HOLIDAYS) {
    if (h.jm === jm && h.jd === jd) return { ...h, source: "sample" };
  }
  return null;
}

export function isHoliday(jy, jm, jd) {
  return getHoliday(jy, jm, jd) !== null;
}
