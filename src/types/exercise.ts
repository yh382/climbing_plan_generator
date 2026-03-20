export interface Exercise {
  id: string;
  nameZh: string;
  nameEn: string;
  goal: string;
  level: string;
  sceneTags: string[];
  blockTags: string[];
  muscles: string[];
  equipment: string[];
  movementPattern: string[];
  protocol: Record<string, any> | null;
  cuesZh: string | null;
  cuesEn: string | null;
  media: { video?: string; image?: string } | null;
  isActive: boolean;
}
