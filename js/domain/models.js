/**
 * Shared domain constants and Persian labels used across pages/components.
 */

export const SHIFT_TYPES = {
  DAY: { id: "DAY", fa: "روزکار", badgeClass: "badge-day", icon: "sun" },
  NIGHT: { id: "NIGHT", fa: "شبکار", badgeClass: "badge-night", icon: "moon" },
  REST: { id: "REST", fa: "استراحت", badgeClass: "badge-rest", icon: "rest" },
};

export const SHIFT_CODE_LABELS = {
  M1: "روزکار",
  M2: "روزکار",
  N1: "شبکار",
  N2: "شبکار",
  R1: "استراحت",
  R2: "استراحت",
  R3: "استراحت",
  R4: "استراحت",
};

export const GROUPS = ["A", "B", "C", "D"];
export const GROUP_FILTERS = ["ALL", "A", "B", "C", "D"];
export const GROUP_FA = { A: "گروه A", B: "گروه B", C: "گروه C", D: "گروه D" };

export const THEMES = [
  { id: "blue", fa: "آبی", color: "#3d6bf5" },
  { id: "emerald", fa: "زمردی", color: "#0f9d72" },
  { id: "purple", fa: "بنفش", color: "#8b5cf6" },
  { id: "orange", fa: "نارنجی", color: "#f46b16" },
  { id: "rose", fa: "رز", color: "#f43f5e" },
  { id: "teal", fa: "فیروزهای", color: "#0ea5a0" },
];

/** Theme appearance modes: light, dark, or follow the OS setting. */
export const THEME_MODES = [
  { id: "light", fa: "روشن", icon: "sun" },
  { id: "dark", fa: "تیره", icon: "moon" },
  { id: "system", fa: "پیروی از سیستم", icon: "settings" },
];

export const APP_INFO = {
  nameFa: "شیفت‌کار",
  nameEn: "ShiftKar",
  version: "5.7.6",
  tagline: "تقویم هوشمند شیفت کاری",
};
