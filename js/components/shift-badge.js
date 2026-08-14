/**
 * Shift badges — consistent visual treatment for DAY / NIGHT / REST.
 */
import { SHIFT_TYPES } from "../domain/models.js";
import { icon } from "./icons.js";

export function shiftBadge(type, { group = null, size = "md", showLabel = true } = {}) {
  const meta = SHIFT_TYPES[type] || SHIFT_TYPES.REST;
  const groupHtml = group ? `<span class="badge-group">${group}</span>` : "";
  const label = showLabel ? `<span class="badge-label">${meta.fa}</span>` : "";
  return `<span class="badge ${meta.badgeClass} badge-${size}" role="img" aria-label="${meta.fa}">${groupHtml}${icon(meta.icon)}${label}</span>`;
}

/** Compact letter chip for ALL-group display (letter tinted by its shift). */
export function miniGroupBadge(group, type) {
  const meta = SHIFT_TYPES[type] || SHIFT_TYPES.REST;
  return `<span class="mini-badge ${meta.badgeClass}" title="گروه ${group} — ${meta.fa}">${group}</span>`;
}
