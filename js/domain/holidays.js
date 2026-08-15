/**
 * Official Iranian holidays.
 *
 * Two layers, both verified against Iranian calendar references
 * (bahesab.ir, time.ir, bani-chap.com):
 *
 * 1. SOLAR_HOLIDAYS — fixed Jalali dates that are official holidays every
 *    year (Nowruz, جمهوری اسلامی، رحلت امام خمینی، قیام ۱۵ خرداد، پیروزی
 *    انقلاب اسلامی، ملی شدن صنعت نفت).
 *
 * 2. YEAR_HOLIDAYS — lunar (Hijri) religious holidays, which drift ~11 days
 *    earlier each solar year. They are stored per year for 1404, 1405 and
 *    1406 (the years this build targets — 1405 is the reference year).
 *
 * When a solar and a lunar holiday land on the same day (e.g. عید غدیر and
 * رحلت امام خمینی on ۱۴ خرداد ۱۴۰۵) both names are merged into one entry.
 */
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

/* ---------- lunar (Hijri) holidays, per Jalali year ---------- */
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

/**
 * Returns { name, source: 'official' } when (jy, jm, jd) is an official
 * holiday, otherwise null. Solar + lunar names on the same day are merged.
 */
export function getHoliday(jy, jm, jd) {
  const names = [];
  for (const h of SOLAR_HOLIDAYS) {
    if (h.jm === jm && h.jd === jd) names.push(h.name);
  }
  const yearList = YEAR_HOLIDAYS[jy];
  if (yearList) {
    for (const h of yearList) {
      if (h.jm === jm && h.jd === jd) names.push(h.name);
    }
  }
  if (!names.length) return null;
  return { name: names.join("، "), source: "official" };
}

export function isHoliday(jy, jm, jd) {
  return getHoliday(jy, jm, jd) !== null;
}
