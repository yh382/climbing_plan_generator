export type SendStyle = "redpoint" | "onsight" | "flash";
export type Feel = "soft" | "solid" | "hard";

export type LogMedia = {
  id: string;
  type: "image" | "video";
  uri: string;
  coverUri?: string; // video thumbnail（如果你以后生成了就填）
};

export type LocalDayLogItem = {
  id: string;
  date: string; // YYYY-MM-DD
  type: "boulder" | "toprope" | "lead";
  grade: string;
  name: string;

  style: SendStyle;
  feel: Feel;

  // ✅ new: per-item accumulation (NOT group)
  sendCount?: number;       // repeat 会 +1
  attemptsTotal?: number;   // repeat 会 +1

  // legacy fields (still supported)
  attempts?: number;        // old: single record attempts
  note?: string;

  // ✅ new: multi-media
  media?: LogMedia[];

  // legacy media fields (still supported)
  videoUri?: string;
  coverUri?: string;
  imageUri?: string;

  createdAt: number;
};
