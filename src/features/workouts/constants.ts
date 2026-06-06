// src/features/workouts/constants.ts
// Shared workout-feature constants. Kept tiny on purpose — anything
// more elaborate should live in services/ or hooks/.

/** System-preset tags surfaced inside TagsPickerSheet's Available row.
 *  These intentionally mix what the BE used to call `goal_tags` with
 *  what it called `equipment` — users design templates around either
 *  axis, so the FE flattens both into one tag space. Equipment column
 *  is still written on save (derived later from blocks[].items[] →
 *  exercise.equipment), so removing it here doesn't break TR7's
 *  body-area-balance JOIN. */
export const TEMPLATE_TAG_PRESETS = [
  // Goal axis
  "strength_power",
  "power_endurance",
  "conditioning",
  "endurance",
  "skill",
  "test",
  // Body axis
  "fingers",
  "core",
  "antagonist",
  // Equipment / scene axis
  "hangboard",
  "bouldering_wall",
  "rope_wall",
  "campus_board",
  "training_board",
  "body_weight",
];

/** Tag slugs that map 1:1 to the BE `workout_templates.equipment` JSONB
 *  column. The Template Builder writes a single flat `tags` list to BE
 *  `goal_tags`, but also derives this subset and writes it to
 *  `equipment` so downstream consumers that read the column directly
 *  keep working — most importantly `services/sessions.py::finalize_session`
 *  which uses `template.equipment ∩ {"bouldering_wall", "rope_wall"}`
 *  to upgrade on-wall training sessions to `session_type="mixed"` (TR6).
 *  Without this derivation every on-wall template (4x4 / ARC / limit
 *  boulder) is misclassified as pure `train` and disappears from the
 *  Sessions feed. Keep this set aligned with the BE consumer; do NOT
 *  rename a slug here without updating finalize_session in lockstep. */
export const EQUIPMENT_TAG_SLUGS = new Set([
  "hangboard",
  "bouldering_wall",
  "rope_wall",
  "campus_board",
  "training_board",
  "body_weight",
]);

/** Localized labels for the preset tag slugs. User-typed tags fall
 *  through and render their raw slug. Hand-maintained because slugs
 *  are stable strings; if you add a preset to TEMPLATE_TAG_PRESETS
 *  add it here too. */
const ZH_DICT: Record<string, string> = {
  strength_power: "力量爆发",
  power_endurance: "力量耐力",
  conditioning: "体能",
  endurance: "耐力",
  skill: "技术",
  test: "测试",
  fingers: "指力",
  core: "核心",
  antagonist: "拮抗肌",
  hangboard: "指力板",
  bouldering_wall: "抱石墙",
  rope_wall: "绳壁",
  campus_board: "夯版",
  training_board: "训练板",
  body_weight: "自重",
};

export function formatTagLabel(slug: string, lang: "zh" | "en"): string {
  if (lang === "zh") return ZH_DICT[slug] ?? slug;
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Weekday → suggested goal tag for the "Suggested for Today" card on
 *  the Activity tab when the user has no active plan. weekday() 0=Sun
 *  … 6=Sat (JS convention).
 *
 *  **Invariant**: every slug used here must remain a member of the
 *  goal-axis subset of `TEMPLATE_TAG_PRESETS`, AND must be a tag that
 *  the official-template seed migration applies to ≥ 1 row — otherwise
 *  the `officialList.find(t => t.goal_tags.includes(goal))` lookup on
 *  the TrainingSegment Today card will always miss for that weekday and
 *  the card falls back to `officialList[0]`. */
export const SUGGESTION_BY_WEEKDAY: Record<number, string> = {
  0: "endurance",       // Sunday
  1: "strength_power",  // Monday
  2: "power_endurance", // Tuesday
  3: "strength_power",  // Wednesday
  4: "power_endurance", // Thursday
  5: "strength_power",  // Friday
  6: "endurance",       // Saturday
};
