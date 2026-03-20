import type { Goal, Level, LocaleKey } from "./types";

/**
 * ✅ block_type 的展示名映射
 * - 后端 summary 返回什么 block_type，这里就尽量覆盖；
 * - 没命中时会 fallback 为格式化后的 block_type（main_endurance → Main Endurance）。
 */
export const BLOCK_LABELS: Record<string, { zh: string; en: string }> = {
  main_endurance: { zh: "耐力", en: "Endurance" },
  main_power: { zh: "爆发力", en: "Power" },
  main_power_endurance: { zh: "力量耐力", en: "Power Endurance" },
  main_technique: { zh: "技术", en: "Technique" },
  main_strength: { zh: "力量", en: "Strength" },
  main_finger_strength: { zh: "指力", en: "Finger Strength" },
  finger_strength: { zh: "指力", en: "Finger Strength" },
  cooldown: { zh: "放松", en: "Cooldown" },
  warmup: { zh: "热身", en: "Warm-up" },
  warmup_general: { zh: "通用热身", en: "General Warm-up" },
  warmup_specific: { zh: "专项热身", en: "Specific Warm-up" },
  test: { zh: "测试", en: "Tests" },
  regen: { zh: "恢复", en: "Regeneration" },
  strength: { zh: "力量", en: "Strength" },
  mobility: { zh: "灵活性", en: "Mobility" },
  accessory_antagonist: { zh: "拮抗肌", en: "Antagonist" },
  accessory_core: { zh: "核心", en: "Core" },
  accessory_mobility: { zh: "灵活性", en: "Mobility" },
};

export function formatBlockTypeFallback(bt: string) {
  return bt
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function blockLabel(bt: string, locale: LocaleKey) {
  const map = BLOCK_LABELS[bt];
  if (map) return map[locale];
  return formatBlockTypeFallback(bt);
}

export const GOAL_LABEL: Record<LocaleKey, Record<Goal, string>> = {
  zh: {
    strength: "力量",
    endurance: "耐力",
    technique: "技术",
    mobility: "灵活性",
    recovery: "恢复",
  },
  en: {
    strength: "Strength",
    endurance: "Endurance",
    technique: "Technique",
    mobility: "Mobility",
    recovery: "Recovery",
  },
};

export const LEVEL_LABEL: Record<LocaleKey, Record<Level, string>> = {
  zh: {
    beginner: "入门",
    intermediate: "进阶",
    advanced: "高级",
  },
  en: {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
};
