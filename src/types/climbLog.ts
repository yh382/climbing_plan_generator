export type WallType = 'boulder' | 'toprope' | 'lead' | 'trad';
export type GradeSystem = 'vscale' | 'yds' | 'font' | 'french';
export type ClimbResult = 'send' | 'flash' | 'onsight' | 'attempt';
export type ClimbFeel = 'soft' | 'solid' | 'hard';

export interface ClimbLog {
  id: string;
  userId: string;
  sessionId: string | null;
  date: string;
  wallType: WallType;
  gradeSystem: GradeSystem;
  gradeText: string;
  gradeScore: number;
  result: ClimbResult;
  feel: ClimbFeel | null;
  styleTags: string[] | null;
  attempts: number;
  gymId: string | null;
  routeName: string | null;
  note: string | null;
  media: MediaItem[] | null;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbUrl?: string;
}
