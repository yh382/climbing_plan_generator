// src/lib/formatProgramDate.ts
// Program/event date formatter — single source of truth for the "May 13" /
// "5月13日" style mandated by DESIGN_LANGUAGE §日期与数字格式. Slash styles
// ("5/13") are banned in climbing UI: they read as YDS grades (5.13).
// Unifies the copies that previously lived in MineEventChip / EventCardRow /
// programs.tsx (CE window, ★4).

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type ProgramDateLang = "zh" | "en";

/** "May 13" (en) / "5月13日" (zh). Returns null for missing/invalid input. */
export function formatProgramDate(
  iso: string | null | undefined,
  lang: ProgramDateLang,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return lang === "zh"
    ? `${d.getMonth() + 1}月${d.getDate()}日`
    : `${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
}

/** "May 13 – May 20" / "5月13日 – 5月20日"; falls back to the single side. */
export function formatProgramDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  lang: ProgramDateLang,
): string | null {
  const s = formatProgramDate(start, lang);
  const e = formatProgramDate(end, lang);
  if (s && e && s !== e) return `${s} – ${e}`;
  return s ?? e;
}
