// src/features/exercises/types.ts
// Matches backend ExerciseOut (snake_case)

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
  protocol_variants: Record<string, any> | null;
  cues_zh: string | null;
  cues_en: string | null;
  rpe_range: number[] | null;
  media: { video?: string; image?: string; thumbnail_url?: string; image_url?: string; thumb?: string } | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
