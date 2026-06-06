// src/features/exercises/types.ts
// Matches backend ExerciseOut (snake_case)

/**
 * TR0: structured variants — same action at different load percentages.
 * Mirrors BE schemas/exercise.py::ProtocolVariant. TR1 exercise-detail
 * renders a horizontal pill row of variants; protocol_fields read
 * variants[selected] || protocol.
 */
export interface ProtocolVariant {
  id: string;                      // "v40" / "v60" / "v80" convention
  label_zh: string;
  label_en: string;
  load_pct?: number | null;        // 0-200, % of max
  load_label?: string | null;      // free-form e.g. "RPE 7" or "+10kg"
  sets?: number | null;
  reps?: number | null;
  seconds?: number | null;
  rest_sec?: number | null;
  rpe?: number | null;
}

export interface ExerciseDetail {
  id: string;
  name_zh: string;
  name_en: string;
  goal: string;
  level: string;
  scene_tags: string[];
  block_tags: string[];
  user_tags: string[];
  duration_min: number | null;
  muscles: string[];
  equipment: string[];
  movement_pattern: string[];
  contraindications: string[];
  protocol: Record<string, any> | null;
  // TR0: typed array (was `Record<string, any>` legacy). null for simple
  // actions; TR1 picker shows pill row only when this is a non-empty array.
  protocol_variants: ProtocolVariant[] | null;
  short_desc_en: string | null;
  short_desc_zh: string | null;
  cues_zh: string | null;
  cues_en: string | null;
  rpe_range: number[] | null;
  media: { video?: string; image?: string; thumbnail_url?: string; image_url?: string; thumb?: string } | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
