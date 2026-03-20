export type LocaleKey = "zh" | "en";

export type I18N = Record<LocaleKey, string>;

export type Goal = "strength" | "endurance" | "technique" | "mobility" | "recovery";
export type Level = "beginner" | "intermediate" | "advanced";

export type BlockInventorySummary = {
  block_type: string;
  action_count: number;
  top_muscles: Array<[string, number]>;
  top_tags: Array<[string, number]>;
};

export type LibrarySummary = {
  library_version: string;
  blocks: BlockInventorySummary[];
};

export type ActionSummary = {
  id: string;
  name: I18N;
  level: Level;
  goal: Goal;
  muscles: string[];
  equipment: string[];
  block_tags: string[];
  user_tags?: string[];
  duration_min?: number;
    // ✅ optional fields (if backend provides later)
  cues?: I18N;
  short_desc?: I18N | string;
  description?: I18N | string;

  // media could be { thumbnail_url, image_url } etc.
  media?: any;

  // duration hints (legacy, kept for backward compat)
  duration_min_range?: [number, number];
  est_duration_min?: number;
};

export type BlockListing = {
  library_version: string;
  block_type: string;
  actions: ActionSummary[];
};
