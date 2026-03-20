// src/features/home/exercises/model/userTaxonomy.ts

import type { ActionSummary, BlockInventorySummary } from "./types";

export type BigCat = "essentials" | "endurance" | "power_endurance" | "strength_power" | "conditioning";

export type SubCatKey =
  | "warmup"
  | "tests"
  | "outdoor"
  | "base_endurance"
  | "regeneration"
  | "sustained_power"
  | "high_intensity"
  | "climbing_strength"
  | "finger_strength"
  | "explosive_power"
  | "antagonist_lower"
  | "core"
  | "flexibility"
  | "upper_body";

export type LocaleKey = "zh" | "en";

export type UserSection = {
  key: SubCatKey;
  title: { en: string; zh: string };
  blocksToLoad: string[];
  userTagsAny?: string[];
};

export type BigCategory = {
  key: BigCat;
  title: { en: string; zh: string };
  homePreview: { en: string[]; zh: string[] };
  sections: UserSection[];
  blocksToLoad: string[];
};

export const HIDDEN_BLOCKS = new Set<string>([]);

export const USER_TAXONOMY: BigCategory[] = [
  {
    key: "essentials",
    title: { en: "Essentials", zh: "基础必备" },
    homePreview: { en: ["Warm-up", "Tests", "Outdoor"], zh: ["热身", "测试", "户外"] },
    sections: [
      {
        key: "warmup",
        title: { en: "Warm-up", zh: "热身" },
        blocksToLoad: ["warmup_general", "warmup_specific"],
        userTagsAny: ["warmup"],
      },
      {
        key: "tests",
        title: { en: "Tests", zh: "测试" },
        blocksToLoad: ["test"],
        userTagsAny: ["tests", "test_protocol"],
      },
      {
        key: "outdoor",
        title: { en: "Outdoor", zh: "户外" },
        blocksToLoad: ["main_strength"],
        userTagsAny: ["outdoor"],
      },
    ],
    blocksToLoad: ["warmup_general", "warmup_specific", "test", "main_strength"],
  },

  {
    key: "endurance",
    title: { en: "Endurance", zh: "耐力" },
    homePreview: { en: ["Base Endurance", "Regeneration"], zh: ["基础耐力", "恢复"] },
    sections: [
      {
        key: "base_endurance",
        title: { en: "Base Endurance", zh: "基础耐力" },
        blocksToLoad: ["main_endurance"],
        userTagsAny: ["aerobic_capacity", "endurance", "capacity"],
      },
      {
        key: "regeneration",
        title: { en: "Regeneration", zh: "恢复" },
        blocksToLoad: ["regen", "cooldown"],
        userTagsAny: ["regeneration", "recovery", "regen", "cooldown"],
      },
    ],
    blocksToLoad: ["main_endurance", "regen", "cooldown"],
  },

  {
    key: "power_endurance",
    title: { en: "Power Endurance", zh: "力量耐力" },
    homePreview: { en: ["Sustained Power", "High-Intensity Capacity"], zh: ["持续输出", "高强度容量"] },
    sections: [
      {
        key: "sustained_power",
        title: { en: "Sustained Power", zh: "持续输出" },
        blocksToLoad: ["main_power_endurance"],
        userTagsAny: ["aerobic_power"],
      },
      {
        key: "high_intensity",
        title: { en: "High-Intensity Capacity", zh: "高强度容量" },
        blocksToLoad: ["main_power_endurance"],
        userTagsAny: ["anaerobic_capacity"],
      },
    ],
    blocksToLoad: ["main_power_endurance"],
  },

  {
    key: "strength_power",
    title: { en: "Strength & Power", zh: "力量 & 爆发" },
    homePreview: { en: ["Climbing Strength", "Finger Strength", "Explosive Power"], zh: ["攀爬力量", "指力", "爆发力"] },
    sections: [
      {
        key: "climbing_strength",
        title: { en: "Climbing Strength", zh: "攀爬力量" },
        blocksToLoad: ["main_strength"],
        userTagsAny: ["bouldering", "board", "routes_boulder", "boulder"],
      },
      {
        key: "finger_strength",
        title: { en: "Finger Strength", zh: "指力" },
        blocksToLoad: ["main_finger_strength", "finger_strength"],
        userTagsAny: ["finger_strength", "fingerboard", "max_hang", "density_hangs", "no_hang"],
      },
      {
        key: "explosive_power",
        title: { en: "Explosive Power", zh: "爆发力" },
        blocksToLoad: ["main_strength"],
        userTagsAny: ["power", "campus", "explosive", "dyno"],
      },
    ],
    blocksToLoad: ["main_strength", "main_finger_strength", "finger_strength"],
  },

  {
    key: "conditioning",
    title: { en: "Conditioning", zh: "体能 & 辅助" },
    homePreview: {
      en: ["Antagonist & Lower Body", "Core", "Flexibility", "Upper Body"],
      zh: ["拮抗肌 & 下肢", "核心", "柔韧", "上肢"],
    },
    sections: [
      {
        key: "antagonist_lower",
        title: { en: "Antagonist & Lower Body", zh: "拮抗肌 & 下肢" },
        blocksToLoad: ["accessory_antagonist"],
        userTagsAny: ["antagonist", "lower_body", "legs", "hip"],
      },
      {
        key: "core",
        title: { en: "Core", zh: "核心" },
        blocksToLoad: ["accessory_core"],
        userTagsAny: ["core"],
      },
      {
        key: "flexibility",
        title: { en: "Flexibility", zh: "柔韧" },
        blocksToLoad: ["accessory_mobility", "regen"],
        userTagsAny: ["flexibility", "mobility", "stretch", "regen"],
      },
      {
        key: "upper_body",
        title: { en: "Upper Body", zh: "上肢" },
        blocksToLoad: ["accessory_antagonist"],
        userTagsAny: ["upper_body", "shoulder", "scapular", "press", "stability"],
      },
    ],
    blocksToLoad: ["accessory_antagonist", "accessory_core", "accessory_mobility", "regen"],
  },
];

export function getCategory(big: BigCat) {
  return USER_TAXONOMY.find((x) => x.key === big);
}

export function getBigBlocksToLoad(big: BigCat, blocks: BlockInventorySummary[]) {
  const cfg = getCategory(big);
  if (!cfg) return [];
  const available = new Set((blocks || []).map((b) => b.block_type));
  return cfg.blocksToLoad.filter((bt) => available.has(bt) && !HIDDEN_BLOCKS.has(bt));
}

export function assignSubcategoryByUserTags(big: BigCat, action: ActionSummary): SubCatKey | null {
  const cfg = getCategory(big);
  if (!cfg) return null;

  const ut = action.user_tags;
  const userTags = Array.isArray(ut) ? ut : [];

  // 1) user_tags match first
  for (const sec of cfg.sections) {
    const any = sec.userTagsAny || [];
    if (any.length && userTags.some((t) => any.includes(t))) return sec.key;
  }

  // 2) fallback by block_tags
  const bt = action.block_tags || [];
  if (big === "endurance") {
    if (bt.includes("main_endurance")) return "base_endurance";
    if (bt.includes("regen") || bt.includes("cooldown")) return "regeneration";
  }
  if (big === "power_endurance") {
    if (bt.includes("main_power_endurance")) return "sustained_power";
  }
  if (big === "strength_power") {
    if (bt.includes("main_finger_strength") || bt.includes("finger_strength")) return "finger_strength";
    if (bt.includes("main_strength")) return "climbing_strength";
  }
  if (big === "conditioning") {
    if (bt.includes("accessory_core")) return "core";
    if (bt.includes("accessory_mobility") || bt.includes("regen")) return "flexibility";
    if (bt.includes("accessory_antagonist")) return "upper_body";
  }
  if (big === "essentials") {
    if (bt.includes("warmup_general") || bt.includes("warmup_specific")) return "warmup";
    if (bt.includes("test")) return "tests";
  }

  return null;
}
