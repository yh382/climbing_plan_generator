// src/features/home/exercises/model/userTaxonomy.ts

import type { ActionSummary, BlockInventorySummary } from "./types";

export type BigCat = "endurance" | "power_endurance" | "strength_power" | "conditioning";

export type SubCatKey =
  | "aerobic_capacity"
  | "regeneration"
  | "aerobic_power"
  | "anaerobic_capacity"
  | "bouldering"
  | "finger_strength"
  | "power_campus"
  | "antagonist_lower"
  | "core"
  | "flexibility"
  | "upper_body";

export type LocaleKey = "zh" | "en";

export type UserSection = {
  key: SubCatKey;
  title: { en: string; zh: string };
  // 哪些编排 block 会被加载（仍然用于后端 block listing 拉取）
  blocksToLoad: string[];
  // 用于从动作 action.user_tags 推断属于哪个小类
  userTagsAny?: string[];
};

export type BigCategory = {
  key: BigCat;
  title: { en: string; zh: string };
  // Home 卡片的小字预览（固定顺序）
  homePreview: { en: string[]; zh: string[] };
  // 页面顶部 tabs（固定顺序）
  sections: UserSection[];
  // 该大类需要加载的 blocks（是 sections.blocksToLoad 的合集）
  blocksToLoad: string[];
};

// 只隐藏 test block，不给用户展示
export const HIDDEN_BLOCKS = new Set<string>(["test"]);

export const USER_TAXONOMY: BigCategory[] = [
  {
    key: "endurance",
    title: { en: "Endurance", zh: "耐力" },
    homePreview: { en: ["Aerobic Capacity", "Regeneration"], zh: ["有氧能力", "恢复"] },
    sections: [
      {
        key: "aerobic_capacity",
        title: { en: "Aerobic Capacity", zh: "有氧能力" },
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
    homePreview: { en: ["Aerobic Power", "Anaerobic Capacity"], zh: ["有氧力量", "无氧能力"] },
    sections: [
      {
        key: "aerobic_power",
        title: { en: "Aerobic Power", zh: "有氧力量" },
        blocksToLoad: ["main_power_endurance"],
        userTagsAny: ["aerobic_power"],
      },
      {
        key: "anaerobic_capacity",
        title: { en: "Anaerobic Capacity", zh: "无氧能力" },
        blocksToLoad: ["main_power_endurance"],
        userTagsAny: ["anaerobic_capacity"],
      },
    ],
    blocksToLoad: ["main_power_endurance"],
  },

  {
    key: "strength_power",
    title: { en: "Strength & Power", zh: "力量 & 爆发" },
    homePreview: { en: ["Bouldering", "Finger Strength", "Power & Campus"], zh: ["抱石", "指力", "爆发 & 校园板"] },
    sections: [
      {
        key: "bouldering",
        title: { en: "Bouldering", zh: "抱石" },
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
        key: "power_campus",
        title: { en: "Power & Campus", zh: "爆发 & 校园板" },
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

  const ut = (action as any).user_tags as string[] | undefined;
  const userTags = Array.isArray(ut) ? ut : [];

  // 1) 优先用 user_tags 匹配
  for (const sec of cfg.sections) {
    const any = sec.userTagsAny || [];
    if (any.length && userTags.some((t) => any.includes(t))) return sec.key;
  }

  // 2) fallback：如果后端还没补 user_tags，则根据 goal/block_tags 粗略推断
  const bt = action.block_tags || [];
  if (big === "endurance") {
    if (bt.includes("main_endurance")) return "aerobic_capacity";
    if (bt.includes("regen") || bt.includes("cooldown")) return "regeneration";
  }
  if (big === "power_endurance") {
    if (bt.includes("main_power_endurance")) return "aerobic_power";
  }
  if (big === "strength_power") {
    if (bt.includes("main_finger_strength") || bt.includes("finger_strength")) return "finger_strength";
    if (bt.includes("main_strength")) return "bouldering";
  }
  if (big === "conditioning") {
    if (bt.includes("accessory_core")) return "core";
    if (bt.includes("accessory_mobility") || bt.includes("regen")) return "flexibility";
    if (bt.includes("accessory_antagonist")) return "upper_body";
  }

  return null;
}
